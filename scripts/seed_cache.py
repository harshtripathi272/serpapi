"""Load saved {"params", "response"} JSON files (probe or experiment output) into the backend cache.

    python scripts/seed_cache.py probe_raw
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from firstseen.serp import DEFAULT_DB, ResponseCache  # noqa: E402


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    cache = ResponseCache(DEFAULT_DB)
    count = 0
    for path in Path(sys.argv[1]).rglob("*.json"):
        record = json.loads(path.read_text(encoding="utf-8"))
        if "params" in record and "response" in record:
            cache.put(record["params"], record["response"])
            count += 1
    print(f"seeded {count} responses into {DEFAULT_DB}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
