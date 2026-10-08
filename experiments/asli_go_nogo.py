#!/usr/bin/env python3
"""Asli go/no-go: can SerpApi trace an Instagram shop's product photos and prices?

For each handle it makes one Instagram Profile call. It then runs Google Lens
(exact matches and products, country=in) on N product photos. If Lens returns
nothing for an Instagram image URL, it downloads the photo, uploads it through
SerpApi's Image API and retries once.

Cost: about 1 + 2N searches per handle (7 at the default N=3), plus 2 for each
upload retry (at most 2 per handle). --discover adds 1. Saved responses are
reused, so re-running is free.

    pip install serpapi pillow        (pillow is only needed for the upload fallback)
    python experiments/asli_go_nogo.py shop_one shop_two shop_three --control a_brand_official
    python experiments/asli_go_nogo.py --discover "korean co ord set cod available"
    python experiments/asli_go_nogo.py shop_one --offline

Raw responses go to asli_raw/, which is git-ignored.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import statistics
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

import requests
import serpapi

POSTS_PER_HANDLE = 3
MAX_UPLOAD_RETRIES = 2
MAX_UPLOAD_BYTES = 500_000

SOCIAL = ("instagram.com", "facebook.com", "pinterest.", "threads.net", "whatsapp.com", "wa.me", "fbcdn.net")
MARKETS = ("aliexpress", "alibaba", "meesho", "amazon", "flipkart", "myntra", "ajio", "shein", "temu",
           "indiamart", "nykaa", "snapdeal", "etsy", "dhgate")

_INR = re.compile(r"(?:₹|rs\.?|inr)\s?([\d,]{2,8})", re.IGNORECASE)
_SLASH_DASH = re.compile(r"\b([\d,]{3,6})\s?/-")
_PRICE_WORD = re.compile(r"\b(?:price|rate|mrp|only|offer)\s*[:\-]*\s*(?:₹|rs\.?|inr)?\s?([\d,]{3,6})\b", re.IGNORECASE)
_HANDLE_URL = re.compile(r"instagram\.com/([A-Za-z0-9_.]{2,30})(?:/(?:p|reel)/[^/]+)?/?(?:\?|$)")
_HANDLE_TEXT = re.compile(r"\(@([A-Za-z0-9_.]{2,30})\)|@([A-Za-z0-9_.]{2,30})\b")
_NOT_HANDLES = {"p", "reel", "reels", "explore", "stories", "tv", "accounts", "about", "developer"}


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
        self.api_key, self.offline = api_key, offline
        self.live_calls = 0
        self.uploads = 0
        self.stopped: str | None = None

    def get(self, path: Path, params: dict) -> dict | None:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))["response"]
        if self.offline or self.stopped:
            return None
        try:
            # The SDK writes api_key into the dict it is given, so pass a copy.
            results = with_retries(lambda: serpapi.Client(api_key=self.api_key, timeout=90).search(dict(params)))
        except serpapi.HTTPError as e:
            if e.status_code in (401, 429):
                self.stopped = f"SerpApi returned {e.status_code}: {e.error}"
            print(f"  ! {params['engine']} failed: {e.status_code} {e.error}")
            return None
        except serpapi.SerpApiError as e:
            print(f"  ! {params['engine']} failed: {e}")
            return None
        self.live_calls += 1
        data = results.as_dict() if hasattr(results, "as_dict") else {"error": "non-JSON response"}
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"params": params, "response": data}, ensure_ascii=False, indent=1),
                        encoding="utf-8")
        return data

    def upload(self, path: Path, image_bytes: bytes) -> str | None:
        """Upload through the Image API. Returns an image_id, valid for 10 minutes."""
        if self.offline or self.stopped:
            return None
        try:
            result = with_retries(lambda: serpapi.Client(api_key=self.api_key, timeout=90).upload_image(io.BytesIO(image_bytes)))
        except serpapi.SerpApiError as e:
            print(f"  ! image upload failed: {e}")
            return None
        self.uploads += 1
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(result), encoding="utf-8")
        if result.get("error"):
            print(f"  ! image upload failed: {result['error']}")
        return result.get("image_id")


def lens_params(kind: str, url: str | None = None, image_id: str | None = None) -> dict:
    params = {"engine": "google_lens", "type": kind, "country": "in", "hl": "en"}
    params.update({"url": url} if url else {"image_id": image_id})
    return params


def inr(text: str | None) -> float | None:
    m = _INR.search(text or "")
    return float(m.group(1).replace(",", "")) if m and m.group(1).replace(",", "") else None


def caption_price(post: dict) -> float | None:
    text = " ".join(post.get("media_captions") or [])
    for pattern in (_INR, _SLASH_DASH, _PRICE_WORD):
        m = pattern.search(text)
        if m:
            value = m.group(1).replace(",", "")
            if value.isdigit() and 50 <= int(value) <= 200_000:
                return float(value)
    return None


def match_price(m: dict) -> float | None:
    p = m.get("price")
    if isinstance(p, dict):
        currency, value = str(p.get("currency") or ""), p.get("extracted_value")
        if value is not None and ("₹" in currency or "INR" in currency.upper() or "RS" in currency.upper()):
            return float(value)
        return inr(p.get("value"))
    if isinstance(p, str):
        return inr(p)
    return None


def domain(link: str | None) -> str:
    host = urlparse(link or "").netloc.lower()
    return host[4:] if host.startswith("www.") else host


def shrink(image: bytes) -> bytes | None:
    if len(image) <= MAX_UPLOAD_BYTES:
        return image
    try:
        from PIL import Image
    except ImportError:
        print("  ! photo is over 500 KB and Pillow isn't installed (pip install pillow)")
        return None
    img = Image.open(io.BytesIO(image)).convert("RGB")
    img.thumbnail((1080, 1080))
    for quality in (85, 75, 60, 45):
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=quality)
        if out.tell() <= MAX_UPLOAD_BYTES:
            return out.getvalue()
    return None


def download(url: str) -> bytes | None:
    # requests ships its own CA bundle; urllib on Windows trips over expired certs in the system store.
    try:
        resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
        resp.raise_for_status()
        return resp.content
    except requests.RequestException as e:
        print(f"  ! couldn't download the photo: {e}")
        return None


def lens_pair(fetcher: Fetcher, base: Path, url: str | None = None, image_id: str | None = None):
    suffix = "_upload" if image_id else ""
    exact = fetcher.get(base.with_name(f"{base.name}_exact{suffix}.json"), lens_params("exact_matches", url, image_id))
    products = fetcher.get(base.with_name(f"{base.name}_products{suffix}.json"), lens_params("products", url, image_id))
    return exact or {}, products or {}


def read_saved(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))["response"] if path.exists() else {}


def results_of(exact: dict, products: dict) -> tuple[list[dict], list[dict]]:
    return exact.get("exact_matches") or [], products.get("visual_matches") or products.get("products") or []


def analyse_handle(fetcher: Fetcher, handle: str, raw_root: Path, n_posts: int, control: bool) -> dict | None:
    print(f"\n=== @{handle}{' (control)' if control else ''} ===")
    hdir = raw_root / handle
    profile_resp = fetcher.get(hdir / "profile.json", {"engine": "instagram_profile", "profile_id": handle})
    profile = (profile_resp or {}).get("profile_results")
    if not profile:
        print(f"  no profile ({(profile_resp or {}).get('error', 'call failed')})")
        return None
    posts = profile.get("posts") or []
    photos = [p for p in posts if not p.get("is_video")] or posts
    print(f"Profile  : {profile.get('followers')} followers | verified {profile.get('is_verified')} | "
          f"professional {profile.get('is_professional_account')} | private {profile.get('is_private')} | "
          f"website {'yes' if profile.get('external_url') else 'none'} | {len(posts)} posts returned "
          f"({len(posts) - len([p for p in posts if not p.get('is_video')])} videos)")

    stats = {"handle": handle, "control": control, "sampled": 0, "lens_ok": 0, "needed_upload": 0,
             "priced": 0, "elsewhere": 0, "markups": [], "caption_prices": 0, "product_results": 0}
    retries = 0
    for post in photos[:n_posts]:
        url = post.get("serpapi_display_url") or post.get("display_url") or post.get("serpapi_thumbnail_src")
        if not url:
            continue
        stats["sampled"] += 1
        cap = caption_price(post)
        stats["caption_prices"] += bool(cap)
        code = re.sub(r"[^A-Za-z0-9_-]", "_", str(post.get("shortcode") or post.get("id") or stats["sampled"]))
        base = hdir / code
        exact, products = lens_pair(fetcher, base, url=url)
        ex, pr = results_of(exact, products)
        via = "url"
        saved_exact = hdir / f"{code}_exact_upload.json"
        if not ex and not pr and (saved_exact.exists() or (retries < MAX_UPLOAD_RETRIES and not fetcher.offline)):
            if saved_exact.exists():
                exact = read_saved(saved_exact)
                products = read_saved(hdir / f"{code}_products_upload.json")
            else:
                retries += 1
                image = None
                for candidate in dict.fromkeys(u for u in (url, post.get("display_url")) if u):
                    image = download(candidate)
                    if image:
                        break
                small = shrink(image) if image else None
                image_id = fetcher.upload(hdir / f"{code}_image_api.json", small) if small else None
                if image_id:
                    exact, products = lens_pair(fetcher, base, image_id=image_id)
            ex, pr = results_of(exact, products)
            via = "upload"
        if not ex and not pr:
            print(f"  post {code}: Lens returned nothing ({exact.get('error') or products.get('error') or 'no results'})")
            continue
        stats["lens_ok"] += 1
        stats["needed_upload"] += via == "upload"

        others = [m for m in ex if domain(m.get("link")) and not any(s in domain(m.get("link")) for s in SOCIAL)]
        prices = sorted(p for p in (match_price(m) for m in ex + pr) if p)
        stats["product_results"] += len(pr)
        stats["priced"] += bool(prices)
        stats["elsewhere"] += bool(others)

        print(f"  post {code}" + (f"  caption price ₹{cap:,.0f}" if cap else "  no price in caption") + f"  [via {via}]")
        hot = sorted({domain(m.get("link")) for m in others if any(k in domain(m.get("link")) for k in MARKETS)})
        dates = [m.get("date") for m in ex if m.get("date")][:3]
        print(f"     exact matches : {len(ex)}, {len(others)} on other sites"
              + (f" incl. {', '.join(hot[:4])}" if hot else "") + (f" | dates seen: {dates}" if dates else ""))
        if prices:
            cheapest = prices[:3]
            ref = statistics.median(cheapest)
            sources = sorted({domain(m.get("link")) for m in ex + pr if match_price(m)})[:4]
            print(f"     priced results: {len(prices)} in INR, lowest ₹{prices[0]:,.0f}, "
                  f"median ₹{statistics.median(prices):,.0f} ({', '.join(sources)})")
            if cap:
                markup = cap / ref
                stats["markups"].append(markup)
                print(f"     markup        : {markup:.1f}x against the 3 cheapest")
        else:
            print(f"     priced results: none of {len(pr)} product results had an INR price")

    # A photographer or meme page has no caption prices and no product matches. Judge only shops.
    stats["shop"] = control or stats["caption_prices"] > 0 or stats["product_results"] > 0
    if not stats["shop"]:
        print("Not a shop: no prices in captions and no product matches. Left out of the verdict.")
    best = max(stats["markups"], default=None)
    print(f"Store    : Lens worked {stats['lens_ok']}/{stats['sampled']} "
          f"({stats['needed_upload']} needed upload), priced {stats['priced']}/{stats['sampled']}, "
          f"photo found elsewhere {stats['elsewhere']}/{stats['sampled']}"
          + (f", best markup {best:.1f}x" if best else ""))
    return stats


def discover(fetcher: Fetcher, raw_root: Path, query: str, limit: int = 3) -> list[str]:
    params = {"engine": "google", "q": f"site:instagram.com {query}", "gl": "in", "hl": "en"}
    resp = fetcher.get(raw_root / f"discover_{re.sub(r'[^a-z0-9]+', '_', query.lower())}.json", params) or {}
    handles: list[str] = []
    for r in resp.get("organic_results") or []:
        found = None
        m = _HANDLE_URL.search(r.get("link") or "")
        source = r.get("source") or ""
        if "instagram.com" in (r.get("link") or "") and source.startswith("Instagram · "):
            found = source.split("·", 1)[1].strip()  # Google shows the poster's handle here
        elif m and m.group(1).lower() not in _NOT_HANDLES:
            found = m.group(1)
        else:
            t = _HANDLE_TEXT.search(f"{r.get('title') or ''} {r.get('snippet') or ''}")
            found = t and (t.group(1) or t.group(2))
        if found and found not in handles:
            handles.append(found)
            print(f"  found @{found}: {(r.get('title') or '')[:80]}")
    print(f"Discovered: {handles[:limit] or 'nothing'}. Check these are shops before trusting the verdict.")
    return handles[:limit]


def verdict(results: list[dict], fetcher: Fetcher) -> int:
    results = [r for r in results if r["shop"]]
    if not any(not r["control"] for r in results):
        print("\nVERDICT: INCONCLUSIVE. No shop handles were analysed. Rerun with real shop handles.")
        print(f"Live SerpApi searches this run: {fetcher.live_calls}; image uploads: {fetcher.uploads}")
        return 3
    sampled = sum(r["sampled"] for r in results)
    lens_ok = sum(r["lens_ok"] for r in results)
    priced = sum(r["priced"] for r in results)
    shops = [r for r in results if not r["control"]]
    stories = [r["handle"] for r in shops if r["elsewhere"] >= 2 or any(m >= 2 for m in r["markups"])]

    c1 = sampled > 0 and lens_ok / sampled >= 0.6
    c2 = lens_ok > 0 and priced / max(lens_ok, 1) >= 0.5
    c3 = bool(stories)
    print("\n=== Criteria ===")
    print(f"[{'PASS' if c1 else 'FAIL'}] Lens reads Instagram photos: {lens_ok}/{sampled} "
          f"({sum(r['needed_upload'] for r in results)} via upload), need >= 60%")
    print(f"[{'PASS' if c2 else 'FAIL'}] INR prices come back: {priced}/{lens_ok} photos with results, need >= 50%")
    print(f"[{'PASS' if c3 else 'FAIL'}] A shop has a story (photo on 2+ other sites, or caption price >= 2x "
          f"the cheapest matches): {stories or 'none'}")
    print(f"Live SerpApi searches this run: {fetcher.live_calls}; image uploads: {fetcher.uploads}")
    if fetcher.stopped:
        print(f"Note: calls stopped early. {fetcher.stopped}")

    if c1 and c2 and c3:
        print("\nVERDICT: GO. Build Asli.")
        return 0
    print("\nVERDICT: NO-GO.")
    if not c1:
        print("Lens can't read these photos, even after upload. Paste this output to Claude before trying more.")
    elif not c2:
        print("Lens finds the products but rarely with INR prices, so the markup story is weak. Paste this to Claude.")
    else:
        print("Lens works, but these shops show nothing. Try 3 other handles once: shops whose prices look "
              "too good, or 'luxury' items at a fraction of retail.")
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
    ap = argparse.ArgumentParser(description="Asli go/no-go test")
    ap.add_argument("handles", nargs="*", help="Instagram shop handles, without @")
    ap.add_argument("--control", help="an official brand account, for comparison")
    ap.add_argument("--discover", metavar="QUERY", action="append", default=[],
                    help="find shop handles with one Google search per query (repeatable)")
    ap.add_argument("--list-only", action="store_true", help="with --discover: print handles and stop")
    ap.add_argument("--posts", type=int, default=POSTS_PER_HANDLE)
    ap.add_argument("--offline", action="store_true", help="analyse saved responses only; make no calls")
    ap.add_argument("--raw-dir", default="asli_raw")
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
            print(f"Searches left on this account: {serpapi.Client(api_key=api_key).account().get('total_searches_left')}")
        except serpapi.SerpApiError as e:
            print(f"Account check failed: {e}")

    handles = [h.lstrip("@") for h in args.handles]
    for query in args.discover:
        found = discover(fetcher, raw_root, query, limit=10 if args.list_only else 3)
        handles += [h for h in found if h not in handles]
    if args.list_only:
        return 0
    if not handles:
        print("Give at least one handle, or --discover QUERY.")
        return 2

    results = [r for r in (analyse_handle(fetcher, h, raw_root, args.posts, control=False) for h in handles) if r]
    if args.control:
        control = analyse_handle(fetcher, args.control.lstrip("@"), raw_root, args.posts, control=True)
        if control:
            results.append(control)
    return verdict(results, fetcher)


if __name__ == "__main__":
    sys.exit(main())
