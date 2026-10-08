"""Parse the dates Google Lens shows on exact matches.

Seen in real responses: "30 Sept 2022", "Today", "1 day ago", "5 days ago".
Also handled: "Yesterday", "N weeks/months/years ago", "Sep 30, 2022", "2022".
Relative dates are resolved against the time SerpApi ran the search.
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta

_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8,
    "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
}
_DAY_MONTH_YEAR = re.compile(r"^(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})$")
_MONTH_DAY_YEAR = re.compile(r"^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$")
_RELATIVE = re.compile(r"^(\d+|an?)\s+(minute|hour|day|week|month|year)s?\s+ago$", re.IGNORECASE)
_YEAR = re.compile(r"^(19|20)\d{2}$")
_UNIT_DAYS = {"minute": 0, "hour": 0, "day": 1, "week": 7, "month": 30, "year": 365}


def _month(name: str) -> int | None:
    name = name.lower()
    return _MONTHS.get(name[:4] if name.startswith("sept") else name[:3])


def parse_lens_date(text: str | None, searched_at: date) -> date | None:
    if not text:
        return None
    t = text.strip()
    low = t.lower()
    if low == "today":
        return searched_at
    if low == "yesterday":
        return searched_at - timedelta(days=1)
    try:
        if m := _DAY_MONTH_YEAR.match(t):
            month = _month(m.group(2))
            return date(int(m.group(3)), month, int(m.group(1))) if month else None
        if m := _MONTH_DAY_YEAR.match(t):
            month = _month(m.group(1))
            return date(int(m.group(3)), month, int(m.group(2))) if month else None
    except ValueError:
        return None
    if m := _RELATIVE.match(t):
        n = 1 if m.group(1).lower() in ("a", "an") else int(m.group(1))
        return searched_at - timedelta(days=n * _UNIT_DAYS[m.group(2).lower()])
    if _YEAR.match(t):
        return date(int(t), 1, 1)
    return None


def searched_at(response: dict) -> date:
    """When SerpApi ran the search ("2026-10-08 17:34:12 UTC"), so replays resolve 'Today' the same way."""
    created = (response.get("search_metadata") or {}).get("created_at") or ""
    try:
        return datetime.strptime(created[:10], "%Y-%m-%d").date()
    except ValueError:
        return date.today()
