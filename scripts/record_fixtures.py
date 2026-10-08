"""Record replay fixtures for the example photos (backend/fixtures/).

Runs every example in backend/firstseen/examples.json through a real check in cache
mode, so anything missing is fetched live once. It then writes exactly the responses
those checks used. Commit the fixtures, never the cache.

    python scripts/record_fixtures.py --clean
"""
from __future__ import annotations

import argparse
import asyncio
import json
import shutil
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

from dotenv import load_dotenv  # noqa: E402

from firstseen.provenance import CheckInput, run_check  # noqa: E402
from firstseen.serp import DEFAULT_FIXTURES, SerpClient, cache_key, export_fixtures  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default=str(DEFAULT_FIXTURES))
    ap.add_argument("--clean", action="store_true", help="delete existing fixtures first")
    args = ap.parse_args()

    load_dotenv(BACKEND / ".env")
    client = SerpClient(mode="cache")
    for ex in json.loads((BACKEND / "firstseen" / "examples.json").read_text(encoding="utf-8")):
        report = asyncio.run(run_check(CheckInput(image_url=ex["image_url"], claim=ex["claim"]), client, lambda e: None))
        print(f"{ex['id']}: {report.verdict.headline}")

    out = Path(args.out)
    if args.clean and out.exists():
        shutil.rmtree(out)
    count = export_fixtures(client.cache, out, keep=lambda params, _: cache_key(params) in client.touched)
    print(f"wrote {count} fixtures to {out} (live searches this run: {client.credits_used})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
