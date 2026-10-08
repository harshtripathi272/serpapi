"""One First Seen check: where an image appeared before, when, and what it was said to show."""
from __future__ import annotations

import asyncio
import re
import uuid
from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any
from urllib.parse import urlparse

from .dates import parse_lens_date, searched_at
from .images import download, sha256, shrink
from .models import CheckEvent, CheckReport, Match, Verdict, YearBucket
from .serp import ReplayMiss, SerpClient

LENS = {"engine": "google_lens", "type": "exact_matches", "country": "in", "hl": "en"}
EXAMPLES_PER_YEAR = 3
WIDELY_SHARED = 5  # dated copies needed before we say an image was widely shared
CORROBORATE_DAYS = 30  # a "first seen" date needs CORROBORATE_SITES sites within this many days
CORROBORATE_SITES = 3
EARLIEST_SHOWN = 12
RECENT_DAYS = 30
# Claim words that mean "this is happening now", in English and romanised Hindi.
_RECENT = re.compile(
    r"\b(today|tonight|now|just|recent|recently|this morning|this week|yesterday|breaking|live|latest|aaj|abhi|kal)\b",
    re.IGNORECASE,
)
_CLAIM_YEAR = re.compile(r"\b(19\d{2}|20\d{2})\b")

REPLAY_ONLY = "Replay mode only knows the example images. Set SERPAPI_MODE=cache and an API key to check others."

EmitFn = Callable[[CheckEvent], None]


class CheckError(RuntimeError):
    pass


@dataclass
class CheckInput:
    image: bytes | None = None
    image_url: str | None = None
    claim: str | None = None


def lens_url_params(url: str) -> dict[str, Any]:
    return {**LENS, "url": url}


def lens_hash_params(digest: str) -> dict[str, Any]:
    """Cache identity for an uploaded image. Each upload gets a new image_id, the bytes don't change."""
    return {**LENS, "image_sha256": digest}


def domain(link: str | None) -> str:
    host = urlparse(link or "").netloc.lower()
    return host[4:] if host.startswith("www.") else host


class _Progress:
    def __init__(self, emit: EmitFn, client: SerpClient):
        self._emit, self._client = emit, client
        self._start = client.credits_used
        self.seq = 0

    @property
    def credits(self) -> int:
        return self._client.credits_used - self._start

    def __call__(self, kind: str, message: str, cached: bool | None = None) -> None:
        self._emit(CheckEvent(seq=self.seq, kind=kind, message=message, cached=cached, credits_used=self.credits))
        self.seq += 1


async def _lens_by_upload(image: bytes, client: SerpClient, progress: _Progress) -> dict[str, Any]:
    identity = lens_hash_params(sha256(image))
    stored = client.cached(identity) if client.mode != "live" else None
    if stored is not None:
        progress("call", "Google Lens exact matches", cached=True)
        return stored
    if client.mode == "replay":
        raise CheckError(REPLAY_ONLY)
    small = await asyncio.to_thread(shrink, image)
    if small is None:
        raise CheckError("That file isn't a JPG, PNG or WebP image we can read.")
    progress("info", "Uploading the image to SerpApi's Image API")
    image_id = await asyncio.to_thread(client.upload_image, small)
    fetched = await asyncio.to_thread(client.search, {**LENS, "image_id": image_id}, identity)
    progress("call", "Google Lens exact matches", cached=fetched.cached)
    return fetched.data


async def find_matches(inp: CheckInput, client: SerpClient, progress: _Progress) -> dict[str, Any]:
    if inp.image_url:
        try:
            fetched = await asyncio.to_thread(client.search, lens_url_params(inp.image_url))
        except ReplayMiss as e:
            raise CheckError(REPLAY_ONLY) from e
        progress("call", "Google Lens exact matches for the image URL", cached=fetched.cached)
        if fetched.data.get("exact_matches") or client.mode == "replay":
            return fetched.data
        # Some sites refuse Google's fetcher. Fetch it ourselves and upload the bytes instead.
        progress("info", "Lens couldn't open that URL, so we're downloading the image")
        inp.image = await asyncio.to_thread(download, inp.image_url)
        if not inp.image:
            return fetched.data
    if not inp.image:
        raise CheckError("Send an image file or an image URL.")
    return await _lens_by_upload(inp.image, client, progress)


def _match(raw: dict[str, Any], when: date) -> Match:
    link = raw.get("link") or ""
    return Match(
        title=(raw.get("title") or raw.get("source") or link).strip(),
        source=raw.get("source"),
        link=link,
        domain=domain(link),
        date_text=raw.get("date"),
        date=parse_lens_date(raw.get("date"), when),
        thumbnail=raw.get("thumbnail"),
        width=raw.get("actual_image_width"),
        height=raw.get("actual_image_height"),
    )


def _distinct(matches: list[Match]) -> list[Match]:
    """One match per site and per title, keeping the order given."""
    seen_domains: set[str] = set()
    seen_titles: set[str] = set()
    out = []
    for m in matches:
        title = re.sub(r"\W+", " ", m.title.lower()).strip()
        if m.domain in seen_domains or title in seen_titles:
            continue
        seen_domains.add(m.domain)
        seen_titles.add(title)
        out.append(m)
    return out


def _ago(earlier: date, later: date) -> str:
    days = (later - earlier).days
    if days >= 730:
        return f"over {days // 365} years"
    if days >= 365:
        return "over a year"
    if days >= 60:
        return f"{days // 30} months"
    return f"{days} days"


def _when(d: date) -> str:
    return f"{d.day} {d:%b %Y}"


def corroborated_first(dated: list[Match], window_days: int = CORROBORATE_DAYS,
                       min_sites: int = CORROBORATE_SITES) -> Match | None:
    """Earliest copy with min_sites different sites showing the image within window_days.

    Pages can carry the wrong date. The December 2015 Chennai airport flood photo has two
    copies dated March 2015, nine months before the floods. Requiring several sites makes
    the date conservative: the image was online at least this early. Falls back to the
    earliest copy when no date is corroborated.
    """
    for i, m in enumerate(dated):
        sites = {m.domain}
        for other in dated[i + 1:]:
            if (other.date - m.date).days > window_days:
                break
            sites.add(other.domain)
        if len(sites) >= min_sites:
            return m
    return dated[0] if dated else None


def widely_shared_by(years: list[YearBucket], threshold: int = WIDELY_SHARED) -> tuple[int, int] | None:
    """First year by which `threshold` dated copies existed, and how many existed by then.

    One old page can be misdated, or have added the image later. A year with several copies is harder to doubt.
    """
    total = 0
    for bucket in years:
        total += bucket.count
        if total >= threshold:
            return bucket.year, total
    return None


def judge(first: Match | None, dated: int, total: int, years: list[YearBucket], claim: str | None,
          searched_on: date, outlier: Match | None = None) -> Verdict:
    if first is None or first.date is None:
        detail = (f"Lens found {total} pages with this exact image, but none show a date."
                  if total else
                  "Lens found no other copies online. That fits an original photo, or one too new to be indexed yet.")
        return Verdict(label="no_history", headline="No earlier copies found", detail=detail)

    active = len(years)
    spread = f"Lens found {dated} dated copies across {active} {'year' if active == 1 else 'years'}."
    if shared := widely_shared_by(years):
        spread += f" {shared[1]} copies existed by the end of {shared[0]}."
    if outlier and outlier.date:
        spread += (f" Some pages are dated earlier, from {_when(outlier.date)} ({outlier.domain}), "
                   "but too few sites agree on those dates to rely on them.")
    claim_years = [int(y) for y in _CLAIM_YEAR.findall(claim or "")]
    says_recent = bool(claim and _RECENT.search(claim))
    old = (searched_on - first.date).days > RECENT_DAYS
    if claim and ((says_recent and old) or (claim_years and first.date.year < min(claim_years))):
        return Verdict(
            label="older_than_claimed",
            headline=f"Online since at least {first.date:%b %Y}, not new",
            detail=(f"The claim presents this as new, but this exact image was on {first.domain} on "
                    f"{_when(first.date)}, {_ago(first.date, searched_on)} before this check. {spread}"),
        )
    return Verdict(
        label="first_seen",
        headline=f"Online since at least {_when(first.date)}",
        detail=f"Earliest well-attested copy: {first.domain}. {spread}"
               + (" Compare that date with what the claim says." if claim else ""),
    )


async def run_check(inp: CheckInput, client: SerpClient, emit: EmitFn, *, check_id: str | None = None) -> CheckReport:
    progress = _Progress(emit, client)
    data = await find_matches(inp, client, progress)

    when = searched_at(data)
    matches = [_match(m, when) for m in data.get("exact_matches") or [] if m.get("link")]
    dated = sorted((m for m in matches if m.date), key=lambda m: m.date)
    by_year: dict[int, list[Match]] = defaultdict(list)
    for m in dated:
        by_year[m.date.year].append(m)
    years = [YearBucket(year=y, count=len(ms), examples=_distinct(ms)[:EXAMPLES_PER_YEAR])
             for y, ms in sorted(by_year.items())]
    first = corroborated_first(dated)
    outlier = dated[0] if dated and first is not dated[0] else None
    progress("info", f"{len(matches)} copies found, {len(dated)} with dates")

    return CheckReport(
        check_id=check_id or uuid.uuid4().hex[:12],
        created_at=datetime.now(timezone.utc),
        mode=client.mode,
        credits_used=progress.credits,
        claim=inp.claim,
        image_url=inp.image_url,
        searched_on=when,
        total_matches=len(matches),
        dated_matches=len(dated),
        domains=len({m.domain for m in matches}),
        first_seen=first,
        earliest_uncorroborated=outlier,
        years=years,
        earliest=_distinct(dated)[:EARLIEST_SHOWN],
        widely_shared_by=(widely_shared_by(years) or (None,))[0],
        verdict=judge(first, len(dated), len(matches), years, inp.claim, when, outlier),
    )
