"""Earlier fact-checks of a photo: found among its own copies, or with one Google search."""
from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

# Domain, or domain plus path prefix, of fact-checking desks. Indian IFCN signatories first.
FACT_CHECKERS = {
    "factly.in": "Factly",
    "boomlive.in": "BOOM",
    "altnews.in": "Alt News",
    "vishvasnews.com": "Vishvas News",
    "newschecker.in": "Newschecker",
    "factcrescendo.com": "Fact Crescendo",
    "thequint.com/news/webqoof": "The Quint WebQoof",
    "indiatoday.in/fact-check": "India Today Fact Check",
    "timesofindia.indiatimes.com/times-fact-check": "Times of India Fact Check",
    "aajtak.in/fact-check": "Aaj Tak Fact Check",
    "newsmobile.in": "NewsMobile",
    "newsmeter.in": "NewsMeter",
    "dfrac.org": "DFRAC",
    "youturn.in": "YouTurn",
    "thelogicalindian.com/fact-check": "The Logical Indian",
    "factcheck.afp.com": "AFP Fact Check",
    "reuters.com/fact-check": "Reuters Fact Check",
    "usatoday.com/story/news/factcheck": "USA Today Fact Check",
    "snopes.com": "Snopes",
    "politifact.com": "PolitiFact",
    "leadstories.com": "Lead Stories",
    "fullfact.org": "Full Fact",
}
_DEBUNK = re.compile(
    r"fact[\s-]?check|\bfake\b|\bhoax|misleading|false claim|old (?:photo|image|picture|video)|passed off|"
    r"morphed|photoshopped|doctored|debunk|फैक्ट चेक|फर्जी|भ्रामक|पुरानी तस्वीर",
    re.IGNORECASE,
)
_RECENT_WORDS = {"today", "todays", "today's", "tonight", "now", "just", "recent", "recently", "breaking", "live",
                 "latest", "yesterday", "aaj", "abhi", "kal", "this", "morning", "week",
                 "आज", "अभी", "कल", "ताज़ा", "ताजा", "लाइव"}
_STOP = {
    "a", "an", "the", "of", "in", "on", "at", "to", "for", "and", "or", "is", "are", "was", "were", "be", "been",
    "after", "before", "during", "with", "by", "from", "as", "it", "its", "that", "these", "those", "here", "there",
    "photo", "photos", "image", "images", "picture", "pictures", "pic", "video", "videos", "viral", "see", "shows",
    "showing", "watch", "new", "released", "release", "up", "lit", "via", "com", "www", "http", "https", "pinterest",
    "facebook", "instagram", "twitter", "youtube", "reddit", "tumblr", "blog", "blogspot", "news", "page", "post",
    "की", "का", "के", "में", "है", "हैं", "से", "पर", "यह", "ये", "और", "को", "तस्वीर", "वीडियो",
}
# Letters plus Indic blocks: Devanagari vowel signs aren't \w, so a plain \w+ splits "अहमदाबाद" in two.
_WORD = re.compile(r"(?:[^\W\d_]|[ऀ-෿]){3,}", re.UNICODE)


def fact_checker_of(link: str | None) -> str | None:
    parsed = urlparse(link or "")
    host, path = parsed.netloc.lower(), parsed.path.lower()
    for prefix, name in FACT_CHECKERS.items():
        domain, _, desk = prefix.partition("/")
        if (host == domain or host.endswith("." + domain)) and path.startswith("/" + desk):
            return name
    return None


_SOCIAL = ("facebook.com", "instagram.com", "x.com", "twitter.com", "youtube.com", "pinterest.", "reddit.com",
           "tumblr.com", "tiktok.com", "threads.net", "sharechat.com", "linkedin.com", "quora.com")


def is_social(link: str | None) -> bool:
    """Posts on social platforms that say 'fake' are often the hoax itself, not a debunk."""
    host = urlparse(link or "").netloc.lower()
    return any(s in host for s in _SOCIAL)


def looks_like_debunk(title: str | None) -> bool:
    return bool(_DEBUNK.search(title or ""))


def claim_keywords(claim: str, limit: int = 7) -> str:
    """'Ahmedabad airport flooded today after heavy rain' -> 'Ahmedabad airport flooded heavy rain'."""
    words = [w for w in _WORD.findall(claim) if w.lower() not in _STOP and w.lower() not in _RECENT_WORDS]
    return " ".join(words[:limit])


def relevant(text: str, keywords: str) -> bool:
    """At least half of the claim's keywords (and at least 2) appear in a news title or snippet."""
    words = {w.lower() for w in keywords.split()}
    hits = sum(1 for w in words if w in text.lower())
    return hits >= max(2, (len(words) + 1) // 2)


def news_search_params(query: str) -> dict[str, Any]:
    """Google News results from the past week (tbm=nws, tbs=qdr:w)."""
    return {"engine": "google", "q": query, "tbm": "nws", "tbs": "qdr:w", "gl": "in", "hl": "en"}
