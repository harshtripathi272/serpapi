"""What each copy of a photo said it showed: named storms, places, events, and the script of the title.

Deterministic, so replays give the same answer. A recycled photo shows up as one image
attached to many contexts: the flood shark was Hurricane Irene in Puerto Rico in 2011,
Houston in 2017, and Chennai in a 2016 Tamil post.
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict

_STORM = re.compile(r"\b((?i:hurricane|cyclone|typhoon|super typhoon))\s+([A-Z][a-z]{2,})\b")

_EVENTS = {
    "Flood": r"flood|inundat|waterlog|deluge|submerge|बाढ़|வெள்ள|వరద|ಪ್ರವಾಹ",
    "Cyclone or hurricane": r"cyclone|hurricane|typhoon|tornado|storm surge",
    "Earthquake": r"earthquake|quake|tremor|भूकंप",
    "Tsunami": r"tsunami",
    "Fire": r"\bfire\b|blaze|wildfire|आग",
    "Riot or violence": r"\briot|violence|clash|mob\b|दंगा",
    "Protest": r"protest|agitation|rally|प्रदर्शन",
    "War or attack": r"\bwar\b|airstrike|missile|bomb|attack|terror",
    "Landslide": r"landslide|cloudburst|avalanche",
    "Diwali": r"diwali|deepavali|दिवाली",
}
_EVENT_RX = {name: re.compile(rx, re.IGNORECASE) for name, rx in _EVENTS.items()}

# Canonical name -> spellings. Indian states and cities first, then places viral photos often get pinned to.
_PLACES = {
    "Chennai": ["chennai", "madras"], "Mumbai": ["mumbai", "bombay"], "Delhi": ["delhi"],
    "Bengaluru": ["bengaluru", "bangalore"], "Kolkata": ["kolkata", "calcutta"], "Hyderabad": ["hyderabad"],
    "Ahmedabad": ["ahmedabad"], "Pune": ["pune"], "Surat": ["surat"], "Jaipur": ["jaipur"], "Lucknow": ["lucknow"],
    "Patna": ["patna"], "Guwahati": ["guwahati"], "Kochi": ["kochi", "cochin"], "Gurugram": ["gurugram", "gurgaon"],
    "Noida": ["noida"], "Srinagar": ["srinagar"], "Amritsar": ["amritsar"], "Varanasi": ["varanasi"],
    "Kerala": ["kerala"], "Tamil Nadu": ["tamil nadu"], "Assam": ["assam"], "Bihar": ["bihar"], "Gujarat": ["gujarat"],
    "Maharashtra": ["maharashtra"], "Karnataka": ["karnataka"], "Uttarakhand": ["uttarakhand"],
    "Himachal Pradesh": ["himachal"], "Punjab": ["punjab"], "Odisha": ["odisha", "orissa"], "West Bengal": ["west bengal"],
    "Andhra Pradesh": ["andhra"], "Telangana": ["telangana"], "Kashmir": ["kashmir"], "Manipur": ["manipur"],
    "Uttar Pradesh": ["uttar pradesh"], "Rajasthan": ["rajasthan"], "India": ["india"],
    "Bangladesh": ["bangladesh", "dhaka"], "Pakistan": ["pakistan", "karachi", "lahore"], "Nepal": ["nepal", "kathmandu"],
    "Sri Lanka": ["sri lanka", "colombo"], "Puerto Rico": ["puerto rico"], "Houston": ["houston"],
    "Texas": ["texas"], "Florida": ["florida", "miami"], "New York": ["new york"], "New Jersey": ["new jersey"],
    "North Carolina": ["north carolina"], "Louisiana": ["louisiana", "new orleans"], "Australia": ["australia", "queensland", "brisbane"],
    "Malaysia": ["malaysia"], "Indonesia": ["indonesia", "jakarta"], "Philippines": ["philippines", "manila"],
    "China": ["china"], "Japan": ["japan", "tokyo"], "Dubai": ["dubai"], "Saudi Arabia": ["saudi"],
    "Turkey": ["turkey", "turkiye", "istanbul"], "Syria": ["syria"], "Gaza": ["gaza"], "Israel": ["israel"],
    "Ukraine": ["ukraine"], "Russia": ["russia"], "United Kingdom": ["london", "britain", "england"],
    "Thailand": ["thailand", "bangkok"], "Vietnam": ["vietnam"], "Myanmar": ["myanmar"], "Afghanistan": ["afghanistan"],
    "Nigeria": ["nigeria"], "Brazil": ["brazil"], "Mexico": ["mexico"], "United States": ["united states", "usa", "america"],
}
_PLACE_RX = {name: re.compile(r"\b(?:" + "|".join(re.escape(s) for s in spellings) + r")\b", re.IGNORECASE)
             for name, spellings in _PLACES.items()}

# Unicode block -> script name, for titles not in Latin script.
_SCRIPTS = [
    ("Devanagari (Hindi, Marathi)", 0x0900, 0x097F), ("Bengali", 0x0980, 0x09FF), ("Gurmukhi (Punjabi)", 0x0A00, 0x0A7F),
    ("Gujarati", 0x0A80, 0x0AFF), ("Odia", 0x0B00, 0x0B7F), ("Tamil", 0x0B80, 0x0BFF), ("Telugu", 0x0C00, 0x0C7F),
    ("Kannada", 0x0C80, 0x0CFF), ("Malayalam", 0x0D00, 0x0D7F), ("Arabic or Urdu", 0x0600, 0x06FF),
    ("Cyrillic", 0x0400, 0x04FF), ("Thai", 0x0E00, 0x0E7F), ("Chinese or Japanese", 0x4E00, 0x9FFF),
    ("Korean", 0xAC00, 0xD7AF),
]


def script_of(title: str) -> str:
    counts: Counter[str] = Counter()
    for ch in title:
        code = ord(ch)
        for name, lo, hi in _SCRIPTS:
            if lo <= code <= hi:
                counts[name] += 1
                break
    return counts.most_common(1)[0][0] if counts else "Latin"


# Capitalised words that follow "Hurricane" in headlines without being a storm's name.
_NOT_STORM_NAMES = {
    "Batters", "Hits", "Slams", "Lashes", "Pounds", "Strikes", "Damage", "Season", "Warning", "Watch", "Live",
    "Update", "Updates", "Tracker", "Relief", "Victims", "Aftermath", "Survivors", "Photo", "Photos", "Pictures",
    "Images", "Video", "Videos", "News", "Fake", "Hoax", "Shark", "Sharks", "Path", "Landfall", "Category",
    "Impact", "Effect", "Hit", "Makes", "Leaves", "Floods", "Flooding",
}
# " | news.com.au — Australia's leading news site", " - Times of India": site names, not context.
_SITE_SUFFIX = re.compile(r"\s(?:\||–|—|-)\s.*$")


def tags_of(title: str) -> list[tuple[str, str]]:
    """(kind, label) pairs: storms, then places, then events."""
    title = _SITE_SUFFIX.sub("", title)
    found: list[tuple[str, str]] = []
    for kind_word, name in _STORM.findall(title):
        if name not in _NOT_STORM_NAMES:
            found.append(("storm", f"{kind_word.title()} {name}"))
    found += [("place", name) for name, rx in _PLACE_RX.items() if rx.search(title)]
    found += [("event", name) for name, rx in _EVENT_RX.items() if rx.search(title)]
    return found


def contexts(dated: list[tuple[int, str]], limit: int = 10) -> list[dict]:
    """Group (year, title) pairs by tag. Storms and places are the 'past lives'; events add colour."""
    years: dict[tuple[str, str], list[int]] = defaultdict(list)
    for year, title in dated:
        for tag in set(tags_of(title)):
            years[tag].append(year)
    # A tag on a single copy is usually noise ("Malaysia" in one aggregator's title).
    ranked = sorted(((tag, ys) for tag, ys in years.items() if len(ys) >= 2),
                    key=lambda kv: (-len(kv[1]), min(kv[1])))
    kind_order = {"storm": 0, "place": 1, "event": 2}
    picked = sorted(ranked[:limit], key=lambda kv: (min(kv[1]), kind_order[kv[0][0]]))
    return [{"kind": kind, "label": label, "count": len(ys), "first_year": min(ys), "last_year": max(ys)}
            for (kind, label), ys in picked]


def mentioned(titles: list[str], exclude: set[str] = frozenset(), limit: int = 6) -> list[str]:
    """Storms and places named in a set of titles, most mentioned first."""
    counts: Counter[str] = Counter(label for t in titles for kind, label in set(tags_of(t))
                                   if kind != "event" and label not in exclude)
    return [label for label, _ in counts.most_common(limit)]


def year_tags(titles: list[str], limit: int = 3) -> list[str]:
    counts: Counter[str] = Counter(label for t in titles for kind, label in set(tags_of(t)) if kind != "event")
    return [label for label, _ in counts.most_common(limit)]


def scripts(titles: list[str]) -> list[dict]:
    counts = Counter(script_of(t) for t in titles)
    return [{"name": name, "count": n} for name, n in counts.most_common()]
