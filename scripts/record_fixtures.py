"""Export the backend's SerpApi cache as replay fixtures (backend/fixtures/).

Record the demo checks in cache mode first, then run this and commit the fixtures,
never the cache. Lens results are public web pages, so nothing is anonymised, but
check them before committing anyway.

    python scripts/record_fixtures.py --clean
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from firstseen.serp import DEFAULT_DB, DEFAULT_FIXTURES, ResponseCache, export_fixtures  # noqa: E402


def replayable(params: dict, response: dict) -> bool:
    # image_id lookups can't be replayed (ids expire in 10 minutes; uploads are keyed by
    # image_sha256 instead), and empty results are dead examples.
    return "image_id" not in params and not response.get("error")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--db", default=str(DEFAULT_DB))
    ap.add_argument("--out", default=str(DEFAULT_FIXTURES))
    ap.add_argument("--clean", action="store_true", help="delete existing fixtures first")
    ap.add_argument("--engine", action="append", default=None, help="engines to export (default: google_lens)")
    args = ap.parse_args()

    out = Path(args.out)
    if args.clean and out.exists():
        shutil.rmtree(out)
    count = export_fixtures(ResponseCache(args.db), out, engines=set(args.engine or ["google_lens"]), keep=replayable)
    print(f"wrote {count} fixtures to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
