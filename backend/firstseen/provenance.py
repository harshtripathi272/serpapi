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

from .contexts import contexts, mentioned, scripts, year_tags
from .dates import parse_lens_date, searched_at
from .factcheck import (
    claim_keywords, fact_checker_of, is_social, looks_like_debunk, news_search_params, relevant,
)
from .reply import replies
from .images import download, sha256, shrink
from .models import (
    Article, CheckEvent, CheckReport, Context, CurrentNews, FactCheck, Match, ScriptCount, Verdict, YearBucket,
)
from .serp import ReplayMiss, SerpClient, SerpError

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


def lens_url_params(url: str, kind: str = "exact_matches") -> dict[str, Any]:
    return {**LENS, "type": kind, "url": url}


def lens_hash_params(digest: str, kind: str = "exact_matches") -> dict[str, Any]:
    """Cache identity for an uploaded image. Each upload gets a new image_id, the bytes don't change."""
    return {**LENS, "type": kind, "image_sha256": digest}


@dataclass
class LensTarget:
    """The image Lens is asked about: a URL, or uploaded bytes (uploaded at most once per check)."""

    url: str | None = None
    image: bytes | None = None
    image_id: str | None = None

    def identity(self, kind: str) -> dict[str, Any]:
        return lens_url_params(self.url, kind) if self.url else lens_hash_params(sha256(self.image), kind)


async def lens(client: SerpClient, target: LensTarget, kind: str, progress: _Progress, label: str) -> dict[str, Any]:
    identity = target.identity(kind)
    if target.url:
        fetched = await asyncio.to_thread(client.search, identity)
    else:
        stored = client.cached(identity) if client.mode != "live" else None
        if stored is not None:
            progress("call", label, cached=True)
            return stored
        if client.mode == "replay":
            raise ReplayMiss(f"no fixture for {kind}")
        if target.image_id is None:
            small = await asyncio.to_thread(shrink, target.image)
            if small is None:
                raise CheckError("That file isn't a JPG, PNG or WebP image we can read.")
            progress("info", "Uploading the image to SerpApi's Image API")
            target.image_id = await asyncio.to_thread(client.upload_image, small)
        fetched = await asyncio.to_thread(client.search, {**LENS, "type": kind, "image_id": target.image_id}, identity)
    progress("call", label, cached=fetched.cached)
    return fetched.data


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


async def find_matches(inp: CheckInput, client: SerpClient, progress: _Progress) -> tuple[dict[str, Any], LensTarget]:
    exact = "Google Lens: pages with this exact image"
    if inp.image_url:
        target = LensTarget(url=inp.image_url)
        try:
            data = await lens(client, target, "exact_matches", progress, exact)
        except ReplayMiss as e:
            raise CheckError(REPLAY_ONLY) from e
        if data.get("exact_matches") or client.mode == "replay":
            return data, target
        # Some sites refuse Google's fetcher. Fetch it ourselves and upload the bytes instead.
        progress("info", "Lens couldn't open that URL, so we're downloading the image")
        inp.image = await asyncio.to_thread(download, inp.image_url)
        if not inp.image:
            return data, target
    if not inp.image:
        raise CheckError("Send an image file or an image URL.")
    target = LensTarget(image=inp.image)
    try:
        return await lens(client, target, "exact_matches", progress, exact), target
    except ReplayMiss as e:
        raise CheckError(REPLAY_ONLY) from e


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
        fact_checker=fact_checker_of(link),
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
    data, target = await find_matches(inp, client, progress)

    when = searched_at(data)
    matches = [_match(m, when) for m in data.get("exact_matches") or [] if m.get("link")]
    dated = sorted((m for m in matches if m.date), key=lambda m: m.date)
    by_year: dict[int, list[Match]] = defaultdict(list)
    for m in dated:
        by_year[m.date.year].append(m)
    years = [YearBucket(year=y, count=len(ms), examples=_distinct(ms)[:EXAMPLES_PER_YEAR],
                        tags=year_tags([m.title for m in ms]))
             for y, ms in sorted(by_year.items())]
    first = corroborated_first(dated)
    outlier = dated[0] if dated and first is not dated[0] else None
    progress("info", f"{len(matches)} copies found, {len(dated)} with dates")

    # Two more searches, run together. Lens visual matches catch fact-checks that republish the photo
    # stamped or in a collage (not exact copies). Google News says whether the claimed event is in the news.
    news_query = claim_keywords(inp.claim) if inp.claim else ""
    similar_data, news_data = await asyncio.gather(
        _optional(lens(client, target, "visual_matches", progress, "Google Lens: visually similar images")),
        _optional(_news(client, progress, news_query)) if news_query else _nothing(),
    )
    fact_checks = _fact_checks(matches, similar_data)
    current_news = _current_news(news_query, news_data) if news_data is not None else None
    verdict = judge(first, len(dated), len(matches), years, inp.claim, when, outlier)
    verdict.detail += _extra_detail(fact_checks, current_news)
    # Places and storms that debunks name, minus where the photo really started: what it was passed off as.
    origin = set(mentioned([m.title for m in dated if first and m.date.year == first.date.year], limit=10))
    falsely_shared_as = mentioned([f.title for f in fact_checks], exclude=origin)

    report = CheckReport(
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
        verdict=verdict,
        fact_checks=fact_checks,
        contexts=[Context(**c) for c in contexts([(m.date.year, m.title) for m in dated])],
        scripts=[ScriptCount(**s) for s in scripts([m.title for m in matches])],
        current_news=current_news,
        falsely_shared_as=falsely_shared_as,
    )
    report.reply = replies(report)
    return report


async def _nothing() -> None:
    return None


async def _optional(search) -> dict | None:
    """A supporting search. If it fails, or replay has no fixture for it, the check still completes."""
    try:
        return await search
    except (ReplayMiss, SerpError, CheckError):
        return None


async def _news(client: SerpClient, progress: _Progress, query: str) -> dict[str, Any]:
    fetched = await asyncio.to_thread(client.search, news_search_params(query))
    progress("call", "Google News, past week, for the claimed event", cached=fetched.cached)
    return fetched.data


def _fact_checks(matches: list[Match], similar: dict | None, limit: int = 8) -> list[FactCheck]:
    """Fact-check pages among the exact copies, then among visually similar images (stamped, cropped, collaged)."""
    found: list[FactCheck] = []
    for m in matches:
        if not is_social(m.link) and (m.fact_checker or looks_like_debunk(m.title)):
            found.append(FactCheck(title=m.title, link=m.link, publisher=m.fact_checker or m.source or m.domain,
                                   date_text=m.date_text, found_in="copies"))
    for r in (similar or {}).get("visual_matches") or []:
        link, title = r.get("link") or "", r.get("title") or ""
        desk = fact_checker_of(link)
        if not is_social(link) and (desk or looks_like_debunk(title)):
            found.append(FactCheck(title=title, link=link, publisher=desk or r.get("source") or domain(link),
                                   date_text=r.get("date"), found_in="similar"))
    # Exact copies before similar images; within each, known desks with debunk wording first.
    found.sort(key=lambda f: (f.found_in != "copies", fact_checker_of(f.link) is None, not looks_like_debunk(f.title)))
    seen: set[str] = set()
    per_publisher: dict[str, int] = defaultdict(int)
    out = []
    for f in found:
        if f.link in seen or per_publisher[f.publisher] >= 2:
            continue
        seen.add(f.link)
        per_publisher[f.publisher] += 1
        out.append(f)
    return out[:limit]


def _current_news(query: str, data: dict, limit: int = 5) -> CurrentNews:
    articles = [Article(title=a.get("title") or "", link=a.get("link") or "", source=a.get("source"),
                        date_text=a.get("date"))
                for a in data.get("news_results") or []
                if a.get("link") and relevant(f"{a.get('title', '')} {a.get('snippet', '')}", query)]
    articles = articles[:limit]
    return CurrentNews(query=query, articles=articles)


def _extra_detail(fact_checks: list[FactCheck], news: CurrentNews | None) -> str:
    out = ""
    desks = list(dict.fromkeys(f.publisher for f in fact_checks if fact_checker_of(f.link)))
    others = list(dict.fromkeys(f.publisher for f in fact_checks if not fact_checker_of(f.link)))
    if desks:
        out += f" Already fact-checked by {', '.join(desks[:3])}"
        out += (f", and called out by {len(others)} other {'outlet' if len(others) == 1 else 'outlets'}."
                if others else ".")
    elif others:
        out += f" Already called out by {', '.join(others[:3])}" + (" and others." if len(others) > 3 else ".")
    if news is not None:
        if news.articles:
            out += (f" News from the past week does mention \"{news.query}\" ({len(news.articles)} articles),"
                    " so the event may be real, but this photo is older.")
        else:
            out += f" No news from the past week matches \"{news.query}\"."
    return out
