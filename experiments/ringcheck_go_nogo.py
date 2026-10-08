#!/usr/bin/env python3
"""RingCheck hour 0-3 go/no-go test.

For three businesses (the top-rated Bengaluru packers and movers, Delhi
hair-transplant clinic and Hyderabad IVF centre on Google Maps right now) it
runs one Maps search, pulls two pages of newest reviews, expands 15 reviewer
histories, saves every raw response, and prints the numbers the decision
rests on.

Cost: 18 searches per business, 54 for all three. Saved responses are reused,
so re-running costs nothing. --pick 1 analyses the next candidate in each city
and spends about 17 more per business.

Setup:
    pip install serpapi
    PowerShell:  $env:SERPAPI_API_KEY = "your key"
    bash:        export SERPAPI_API_KEY="your key"
Run:
    python experiments/ringcheck_go_nogo.py
    python experiments/ringcheck_go_nogo.py --only del-hair --pick 1
    python experiments/ringcheck_go_nogo.py --offline        # saved JSON only, no calls

Raw responses contain reviewer names. spike_raw/ is git-ignored; keep it that way.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import time
import threading
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import serpapi

TARGETS = [
    {"key": "blr-movers", "label": "Bengaluru packers and movers",
     "q": "packers and movers in Bengaluru", "ll": "@12.9716,77.5946,12z"},
    {"key": "del-hair", "label": "Delhi hair transplant clinic",
     "q": "hair transplant clinic in Delhi", "ll": "@28.6139,77.2090,12z"},
    {"key": "hyd-ivf", "label": "Hyderabad IVF centre",
     "q": "IVF centre in Hyderabad", "ll": "@17.3850,78.4867,12z"},
]

# Target choice: highest rating among businesses with at least MIN_REVIEWS reviews.
MIN_RATING = 4.5
MIN_REVIEWS = 150

CONTRIBUTORS_PER_BUSINESS = 15
LOCAL_KM = 5.0              # shared places this close to the target, or to each other, don't count separately
MIN_SHARED_REVIEWERS = 3
GO_MIN_CLUSTERS = 3         # far-apart shared places one business needs to pass
THROWAWAY_MAX_REVIEWS = 2
MIN_NONEMPTY_RATE = 0.5
NUM_CAP = 10                # if num=200 is ignored, histories stop at 10

LANDMARK = re.compile(
    r"\b(airport|railway station|train station|metro station|bus station|shopping mall|mall|"
    r"temple|mosque|church|gurudwara|park|tourist attraction|historical landmark|monument|"
    r"museum|fort|palace|lake|beach|stadium|zoo)\b",
    re.IGNORECASE,
)
PIN = re.compile(r"\b\d{6}\b")


# Parameter sets the RingCheck backend used (removed after this test said NO-GO).
def maps_search_params(q: str, ll: str) -> dict:
    return {"engine": "google_maps", "type": "search", "q": q, "ll": ll, "hl": "en", "gl": "in"}


def reviews_params(data_id: str, token: str | None = None) -> dict:
    params = {"engine": "google_maps_reviews", "data_id": data_id, "sort_by": "newestFirst", "hl": "en"}
    if token:
        params.update({"next_page_token": token, "num": 20})
    return params


def contributor_params(contributor_id: str) -> dict:
    return {"engine": "google_maps_contributor_reviews", "contributor_id": contributor_id, "num": 200, "hl": "en"}


def with_retries(call, attempts: int = 4):
    """Retry dropped connections (HTTPConnectionError). These never reach SerpApi, so they cost nothing."""
    for attempt in range(attempts):
        try:
            return call()
        except serpapi.HTTPConnectionError:
            if attempt == attempts - 1:
                raise
            time.sleep(2 * (attempt + 1))


class Fetcher:
    """SerpApi calls with a file per response. An existing file is never re-fetched."""

    def __init__(self, api_key: str | None, offline: bool):
        self.api_key = api_key
        self.offline = offline
        self.live_calls = 0
        self.stopped: str | None = None
        self._lock = threading.Lock()

    def get(self, path: Path, params: dict) -> dict | None:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))["response"]
        if self.offline or self.stopped:
            return None
        try:
            # The SDK writes api_key into the dict it is given, so pass a copy.
            results = with_retries(lambda: serpapi.Client(api_key=self.api_key, timeout=60).search(dict(params)))
        except serpapi.HTTPError as e:
            if e.status_code in (401, 429):
                self.stopped = f"SerpApi returned {e.status_code}: {e.error}"
            print(f"  ! {params['engine']} failed: {e.status_code} {e.error}")
            return None
        except serpapi.SerpApiError as e:
            print(f"  ! {params['engine']} failed: {e}")
            return None
        with self._lock:
            self.live_calls += 1
        data = results.as_dict() if hasattr(results, "as_dict") else {"error": "non-JSON response"}
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"params": params, "response": data}, ensure_ascii=False, indent=1),
                        encoding="utf-8")
        return data


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def point(gps: dict | None) -> tuple[float, float] | None:
    if not gps or gps.get("latitude") is None or gps.get("longitude") is None:
        return None
    return float(gps["latitude"]), float(gps["longitude"])


def locality(address: str | None) -> str:
    if not address:
        return "?"
    parts = [PIN.sub("", p).strip() for p in address.split(",")]
    return ", ".join(p for p in parts[-2:] if p) or "?"


def count_clusters(points: list[tuple[float, float]], radius_km: float) -> int:
    centres: list[tuple[float, float]] = []
    for p in points:
        if all(haversine_km(p, c) > radius_km for c in centres):
            centres.append(p)
    return len(centres)


def pick_target(results: list[dict], pick: int) -> dict | None:
    usable = [r for r in results if r.get("data_id")]
    strong = [r for r in usable if (r.get("rating") or 0) >= MIN_RATING and (r.get("reviews") or 0) >= MIN_REVIEWS]
    pool = sorted(strong, key=lambda r: (-(r.get("rating") or 0), -(r.get("reviews") or 0)))
    if not pool:
        pool = sorted(usable, key=lambda r: -(r.get("reviews") or 0))
    return pool[pick] if pick < len(pool) else None


def select_reviewers(reviews: list[dict], limit: int) -> list[str]:
    """4-5 star reviewers, accounts with tens of reviews first.

    Two-review accounts are a last resort. Heavy reviewers (200+) overlap with
    everyone and are skipped.
    """
    seen: set[str] = set()
    primary, backup = [], []
    for r in reviews:
        user = r.get("user") or {}
        cid, n, rating = user.get("contributor_id"), user.get("reviews"), r.get("rating") or 0
        if not cid or cid in seen or rating < 4 or not isinstance(n, int):
            continue
        seen.add(cid)
        if 3 <= n <= 200:
            primary.append((-rating, abs(math.log(n / 20)), cid))
        elif n == 2:
            backup.append((-rating, 0.0, cid))
    return [cid for *_, cid in sorted(primary) + sorted(backup)][:limit]


def safe(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]", "_", name)


def run_target(fetcher: Fetcher, t: dict, raw_root: Path, pick: int) -> dict | None:
    print(f"\n=== {t['label']} ({t['key']}, candidate #{pick}) ===")
    search = fetcher.get(raw_root / t["key"] / "maps_search.json", maps_search_params(t["q"], t["ll"]))
    if not search:
        print("  Maps search unavailable, skipping")
        return None
    results = search.get("local_results") or ([search["place_results"]] if search.get("place_results") else [])
    target = pick_target(results, pick)
    if not target:
        print(f"  no candidate #{pick} among {len(results)} Maps results")
        return None
    data_id = target["data_id"]
    biz_dir = raw_root / t["key"] / safe(data_id)
    print(f"Target   : {target.get('title')} | {target.get('rating')} stars | "
          f"{target.get('reviews')} reviews | {target.get('type')}")

    p1 = fetcher.get(biz_dir / "reviews_p1.json", reviews_params(data_id))
    if not p1 or not p1.get("reviews"):
        print(f"  no reviews returned ({(p1 or {}).get('error', 'call failed')})")
        return None
    pages = [p1]
    token = (p1.get("serpapi_pagination") or {}).get("next_page_token")
    if token:
        p2 = fetcher.get(biz_dir / "reviews_p2.json", reviews_params(data_id, token))
        if p2 and p2.get("reviews"):
            pages.append(p2)
    reviews = [r for p in pages for r in p.get("reviews") or []]

    five = [r for r in reviews if (r.get("rating") or 0) >= 5]
    known = [r for r in five if isinstance((r.get("user") or {}).get("reviews"), int)]
    throwaway = sum(1 for r in known if r["user"]["reviews"] <= THROWAWAY_MAX_REVIEWS)
    throwaway_share = throwaway / len(known) if known else None

    chosen = select_reviewers(reviews, CONTRIBUTORS_PER_BUSINESS)
    expected = {(r.get("user") or {}).get("contributor_id"): (r.get("user") or {}).get("reviews") for r in reviews}
    with ThreadPoolExecutor(max_workers=5) as pool:
        fetched = list(pool.map(
            lambda cid: (cid, fetcher.get(biz_dir / "contributors" / f"{safe(cid)}.json", contributor_params(cid))),
            chosen))

    failed = nonempty = cap_checked = capped = 0
    ratios: list[float] = []
    place_reviewers: dict[str, set[str]] = defaultdict(set)
    place_info: dict[str, dict] = {}
    for cid, hist in fetched:
        if hist is None:
            failed += 1
            continue
        items = hist.get("reviews") or []
        others = [it for it in items if (it.get("place_info") or {}).get("data_id") != data_id]
        if others:
            nonempty += 1
        n = expected.get(cid)
        if isinstance(n, int) and n > NUM_CAP:
            cap_checked += 1
            ratios.append(min(len(items) / n, 1.0))
            if len(items) == NUM_CAP:  # exactly the default page size: num=200 was ignored
                capped += 1
        for it in others:
            info = it.get("place_info") or {}
            pid = info.get("data_id") or f"{info.get('title')}|{info.get('address')}"
            place_reviewers[pid].add(cid)
            place_info[pid] = info

    tloc = point(target.get("gps_coordinates"))
    far, local, landmarks, no_gps = [], 0, 0, 0
    for pid, who in place_reviewers.items():
        if len(who) < MIN_SHARED_REVIEWERS:
            continue
        info = place_info[pid]
        loc = point(info.get("gps_coordinates"))
        if LANDMARK.search(info.get("type") or ""):
            landmarks += 1
        elif loc is None:
            no_gps += 1
        elif tloc and haversine_km(tloc, loc) <= LOCAL_KM:
            local += 1
        else:
            far.append((len(who), haversine_km(tloc, loc) if tloc else None, loc, info))
    far.sort(key=lambda x: -x[0])
    clusters = count_clusters([loc for _, _, loc, _ in far], LOCAL_KM)

    print(f"Reviews  : {len(reviews)} pulled, {len(five)} five-star")
    if throwaway_share is None:
        print("Throwaway: no reviewer counts on five-star reviews")
    else:
        print(f"Throwaway: {throwaway} of {len(known)} five-star reviews ({throwaway_share:.0%}) "
              f"come from accounts with <= {THROWAWAY_MAX_REVIEWS} reviews")
    print(f"Histories: {nonempty} of {len(chosen)} non-empty, {failed} failed")
    median = sorted(ratios)[len(ratios) // 2] if ratios else None
    print(f"num=200  : {cap_checked} reviewers had > {NUM_CAP} reviews; {capped} came back with exactly {NUM_CAP}"
          + (f"; median history returned = {median:.0%} of their review count" if median is not None else ""))
    print(f"Shared   : {len(far)} far-apart places shared by {MIN_SHARED_REVIEWERS}+ reviewers, "
          f"in {clusters} separate {LOCAL_KM:g} km clusters "
          f"(ignored: {local} local, {landmarks} landmarks, {no_gps} without GPS)")
    for n, dist, _, info in far[:10]:
        dist_s = f"{dist:,.0f} km" if dist is not None else "? km"
        print(f"           {n} reviewers | {info.get('type') or '?'} | {dist_s} | "
              f"{locality(info.get('address'))} | {(info.get('title') or '')[:40]}")
    passed = clusters >= GO_MIN_CLUSTERS
    print(f"Result   : {'PASS' if passed else 'FAIL'} (needs >= {GO_MIN_CLUSTERS} clusters)")
    return {"key": t["key"], "requested": len(chosen), "nonempty": nonempty, "cap_checked": cap_checked,
            "capped": capped, "clusters": clusters, "throwaway_share": throwaway_share, "passed": passed}


def verdict(results: list[dict | None], expected: int, fetcher: Fetcher) -> int:
    ok = [r for r in results if r]
    requested = sum(r["requested"] for r in ok)
    nonempty = sum(r["nonempty"] for r in ok)
    rate = nonempty / requested if requested else 0.0
    cap_checked = sum(r["cap_checked"] for r in ok)
    capped = sum(r["capped"] for r in ok)
    passing = [r["key"] for r in ok if r["passed"]]

    c1 = rate >= MIN_NONEMPTY_RATE
    c2 = not (cap_checked >= 3 and capped == cap_checked)
    c3 = bool(passing)

    print("\n=== Criteria ===")
    print(f"[{'PASS' if c1 else 'FAIL'}] Histories available: {nonempty}/{requested} non-empty ({rate:.0%}), "
          f"need >= {MIN_NONEMPTY_RATE:.0%}")
    if cap_checked < 3:
        print(f"[PASS] num=200 check inconclusive: only {cap_checked} reviewers had > {NUM_CAP} reviews")
    else:
        print(f"[{'PASS' if c2 else 'FAIL'}] num=200 returns full histories: "
              f"{capped} of {cap_checked} came back capped at {NUM_CAP}")
    print(f"[{'PASS' if c3 else 'FAIL'}] Ring signal: {len(passing)} of {len(ok)} businesses have "
          f">= {GO_MIN_CLUSTERS} far-apart places shared by {MIN_SHARED_REVIEWERS}+ reviewers "
          f"{passing if passing else ''}")
    if len(ok) < expected:
        print(f"Note: {expected - len(ok)} business(es) could not be analysed; see messages above.")
    if fetcher.stopped:
        print(f"Note: calls stopped early. {fetcher.stopped}")
    print(f"Live SerpApi calls this run: {fetcher.live_calls}")

    if c1 and c2 and c3:
        print("\nVERDICT: GO. Build RingCheck. Seed the app cache with scripts/seed_cache.py spike_raw.")
        return 0
    print("\nVERDICT: NO-GO.")
    if not c1:
        print("Most reviewer histories are empty or private, so the graph method can't work. Switch to Asli.")
    elif not c2:
        print("num=200 is capped at 10, so a full scan costs about 4x the budget. Switch to Asli.")
    else:
        high = [r["key"] for r in ok if (r["throwaway_share"] or 0) >= 0.4]
        if high:
            print(f"Throwaway share is high for {high}, but that alone isn't the demo.")
        print("If you haven't yet, rerun once with --pick 1 (about 51 more searches). "
              "If that is also NO-GO, switch to Asli.")
    return 1


def load_env_file() -> None:
    """Read backend/.env (git-ignored) so the key doesn't have to be exported in every shell."""
    env = Path(__file__).resolve().parents[1] / "backend" / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        key, sep, value = line.partition("=")
        key = key.strip()
        if sep and key and not key.startswith("#") and not os.getenv(key):
            os.environ[key] = value.strip().strip("\"'")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="RingCheck go/no-go test")
    ap.add_argument("--pick", type=int, default=0, help="0 = best candidate per city, 1 = next one, ...")
    ap.add_argument("--only", action="append", choices=[t["key"] for t in TARGETS],
                    help="run only these targets (repeatable)")
    ap.add_argument("--offline", action="store_true", help="analyse saved responses only; make no calls")
    ap.add_argument("--raw-dir", default="spike_raw")
    args = ap.parse_args()

    load_env_file()
    api_key = os.getenv("SERPAPI_API_KEY") or os.getenv("SERPAPI_KEY")
    if not api_key and not args.offline:
        print("Set SERPAPI_API_KEY first (or pass --offline).")
        return 2

    raw_root = Path(args.raw_dir)
    raw_root.mkdir(parents=True, exist_ok=True)
    (raw_root / ".gitignore").write_text("*\n", encoding="utf-8")

    fetcher = Fetcher(api_key, args.offline)
    if not args.offline:
        try:
            account = serpapi.Client(api_key=api_key, timeout=30).account()
            print(f"Searches left on this account: {account.get('total_searches_left')}")
        except serpapi.SerpApiError as e:
            print(f"Account check failed: {e}")

    targets = [t for t in TARGETS if not args.only or t["key"] in args.only]
    results = [run_target(fetcher, t, raw_root, args.pick) for t in targets]
    return verdict(results, len(targets), fetcher)


if __name__ == "__main__":
    sys.exit(main())
