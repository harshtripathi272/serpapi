"""Report and event schemas. web/lib/schema.ts mirrors these; change both together."""
from __future__ import annotations

from datetime import date as Date, datetime
from typing import Literal

from pydantic import BaseModel


class Match(BaseModel):
    title: str
    source: str | None = None
    link: str
    domain: str
    date_text: str | None = None
    date: Date | None = None
    thumbnail: str | None = None
    width: int | None = None
    height: int | None = None


class YearBucket(BaseModel):
    year: int
    count: int
    examples: list[Match]


class Verdict(BaseModel):
    label: Literal["older_than_claimed", "first_seen", "no_history"]
    headline: str
    detail: str


class CheckReport(BaseModel):
    check_id: str
    created_at: datetime
    mode: Literal["live", "cache", "replay"]
    credits_used: int
    claim: str | None = None
    image_url: str | None = None
    searched_on: Date
    total_matches: int
    dated_matches: int
    domains: int
    first_seen: Match | None = None
    earliest_uncorroborated: Match | None = None
    widely_shared_by: int | None = None
    years: list[YearBucket]
    earliest: list[Match]
    verdict: Verdict


class CheckEvent(BaseModel):
    seq: int
    kind: Literal["info", "call", "done", "error"]
    message: str
    cached: bool | None = None
    credits_used: int = 0
