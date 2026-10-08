"""SerpApi access for First Seen: one search function, an SQLite cache, and a replay mode.

SERPAPI_MODE
  live    always call SerpApi and store the response
  cache   serve from SQLite when present, otherwise call SerpApi (default)
  replay  never touch the network: serve committed fixtures, then the SQLite cache
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import sqlite3
import threading
import time
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import serpapi

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB = Path(os.getenv("FIRSTSEEN_DB") or BACKEND_DIR / ".cache" / "serpapi.sqlite")
DEFAULT_FIXTURES = Path(os.getenv("FIRSTSEEN_FIXTURES") or BACKEND_DIR / "fixtures")
MODES = ("live", "cache", "replay")

# Parameters that don't change what SerpApi returns.
_IGNORED = {"api_key", "no_cache", "async", "output", "zero_trace"}


class SerpError(RuntimeError):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class ReplayMiss(SerpError):
    pass


def canonical_params(params: dict[str, Any]) -> dict[str, str]:
    return {k: str(v) for k, v in sorted(params.items()) if k not in _IGNORED and v is not None}


def cache_key(params: dict[str, Any]) -> str:
    blob = json.dumps(canonical_params(params), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(blob.encode()).hexdigest()


class ResponseCache:
    def __init__(self, path: Path | str = DEFAULT_DB):
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(path, check_same_thread=False)
        self._db.execute(
            "CREATE TABLE IF NOT EXISTS responses ("
            " key TEXT PRIMARY KEY, engine TEXT NOT NULL, params TEXT NOT NULL,"
            " response TEXT NOT NULL, created_at REAL NOT NULL)"
        )
        self._db.commit()
        self._lock = threading.Lock()

    def get(self, key: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._db.execute("SELECT response FROM responses WHERE key = ?", (key,)).fetchone()
        return json.loads(row[0]) if row else None

    def put(self, params: dict[str, Any], response: dict[str, Any]) -> str:
        key = cache_key(params)
        clean = {k: v for k, v in params.items() if k != "api_key"}
        with self._lock:
            self._db.execute(
                "INSERT OR REPLACE INTO responses VALUES (?, ?, ?, ?, ?)",
                (key, str(params.get("engine", "")), json.dumps(clean), json.dumps(response), time.time()),
            )
            self._db.commit()
        return key

    def rows(self) -> Iterator[tuple[dict[str, Any], dict[str, Any]]]:
        with self._lock:
            rows = self._db.execute("SELECT params, response FROM responses ORDER BY created_at").fetchall()
        for params, response in rows:
            yield json.loads(params), json.loads(response)


def load_fixtures(directory: Path) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    if directory.is_dir():
        for path in directory.rglob("*.json"):
            record = json.loads(path.read_text(encoding="utf-8"))
            index[cache_key(record["params"])] = record["response"]
    return index


def export_fixtures(cache: ResponseCache, out_dir: Path, transform=None, engines: set[str] | None = None) -> int:
    """Write cached responses as replay fixtures. transform(params, response) may rewrite both."""
    count = 0
    for params, response in cache.rows():
        if engines and params.get("engine") not in engines:
            continue
        p, r = transform(params, response) if transform else (params, response)
        path = out_dir / str(p.get("engine", "unknown")) / f"{cache_key(p)[:20]}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"params": p, "response": r}, ensure_ascii=False, indent=1), encoding="utf-8")
        count += 1
    return count


@dataclass(frozen=True)
class Fetched:
    data: dict[str, Any]
    cached: bool


class SerpClient:
    def __init__(
        self,
        api_key: str | None = None,
        mode: str | None = None,
        db_path: Path | str | None = None,
        fixtures_dir: Path | str | None = None,
        timeout: float = 60.0,
    ):
        self.mode = (mode or os.getenv("SERPAPI_MODE") or "cache").lower()
        if self.mode not in MODES:
            raise ValueError(f"SERPAPI_MODE must be one of {MODES}, got {self.mode!r}")
        self.api_key = api_key or os.getenv("SERPAPI_API_KEY")
        if self.mode != "replay" and not self.api_key:
            raise SerpError("SERPAPI_API_KEY is not set. Set it, or run with SERPAPI_MODE=replay.")
        self.timeout = timeout
        self.cache = ResponseCache(db_path or DEFAULT_DB)
        fixtures = Path(fixtures_dir or DEFAULT_FIXTURES)
        self._fixtures = load_fixtures(fixtures) if self.mode == "replay" else {}
        self._lock = threading.Lock()
        self.credits_used = 0  # SerpApi searches made by this process

    def cached(self, cache_params: dict[str, Any]) -> dict[str, Any] | None:
        """A stored response for these parameters, from fixtures or the cache. Never calls SerpApi."""
        key = cache_key(cache_params)
        return self._fixtures.get(key) or self.cache.get(key)

    def search(self, params: dict[str, Any], cache_params: dict[str, Any] | None = None) -> Fetched:
        """cache_params replaces params as the cache identity, e.g. an image hash instead of an image_id."""
        identity = cache_params or params
        if self.mode != "live":
            data = self.cached(identity)
            if data is not None:
                return Fetched(data, cached=True)
        if self.mode == "replay":
            raise ReplayMiss(f"no fixture for {params.get('engine')} {cache_key(identity)[:12]}")
        data = self._call(params)
        self.cache.put(identity, data)
        return Fetched(data, cached=False)

    def upload_image(self, image: bytes) -> str:
        """Upload through SerpApi's Image API and return an image_id (valid 10 minutes).

        Uploads didn't use search credits when we measured them.
        """
        if self.mode == "replay":
            raise ReplayMiss("replay mode can't upload images")
        client = serpapi.Client(api_key=self.api_key, timeout=self.timeout)
        try:
            result = self._with_retries(lambda: client.upload_image(io.BytesIO(image)))
        except serpapi.SerpApiError as e:
            raise SerpError(f"image upload failed: {e}") from e
        if not result.get("image_id"):
            raise SerpError(f"image upload failed: {result.get('error', 'no image_id returned')}")
        return result["image_id"]

    @staticmethod
    def _with_retries(call, attempts: int = 4):
        """Retry dropped connections. They never reach SerpApi, so they cost nothing."""
        for attempt in range(attempts):
            try:
                return call()
            except serpapi.HTTPConnectionError:
                if attempt == attempts - 1:
                    raise
                time.sleep(2 * (attempt + 1))

    def _call(self, params: dict[str, Any]) -> dict[str, Any]:
        client = serpapi.Client(api_key=self.api_key, timeout=self.timeout)
        try:
            # The SDK writes api_key into the dict it is given, so pass a copy.
            results = self._with_retries(lambda: client.search(dict(params)))
        except serpapi.HTTPError as e:
            raise SerpError(e.error or str(e), status_code=e.status_code) from e
        except serpapi.SerpApiError as e:
            raise SerpError(str(e)) from e
        with self._lock:
            self.credits_used += 1
        if isinstance(results, str):
            raise SerpError(f"non-JSON response from {params.get('engine')}")
        return results.as_dict()
