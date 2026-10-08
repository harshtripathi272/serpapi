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
    fact_checker: str | None = None


class YearBucket(BaseModel):
    year: int
    count: int
    examples: list[Match]
    tags: list[str] = []


class FactCheck(BaseModel):
    title: str
    link: str
    publisher: str
    date_text: str | None = None
    found_in: Literal["copies", "similar"]


class Article(BaseModel):
    title: str
    link: str
    source: str | None = None
    date_text: str | None = None


class CurrentNews(BaseModel):
    query: str
    articles: list[Article]


class Context(BaseModel):
    kind: Literal["storm", "place", "event"]
    label: str
    count: int
    first_year: int
    last_year: int


class ScriptCount(BaseModel):
    name: str
    count: int


class Reply(BaseModel):
    en: str
    hi: str


class FrameResult(BaseModel):
    """One keyframe of a video, checked on its own."""

    time_s: float
    scene_seconds: float
    copies: int
    first_seen: Date | None = None
    first_seen_domain: str | None = None


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
    fact_checks: list[FactCheck] = []
    falsely_shared_as: list[str] = []
    contexts: list[Context] = []
    scripts: list[ScriptCount] = []
    current_news: CurrentNews | None = None
    reply: Reply | None = None
    media: Literal["image", "video"] = "image"
    frames: list[FrameResult] = []


class CheckEvent(BaseModel):
    seq: int
    kind: Literal["info", "call", "done", "error"]
    message: str
    cached: bool | None = None
    credits_used: int = 0
