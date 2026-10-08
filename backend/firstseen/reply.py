"""A short reply to paste back into the chat the photo came from, in English and Hindi."""
from __future__ import annotations

from datetime import date

from .factcheck import fact_checker_of
from .models import CheckReport, Reply

_HI_MONTHS = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"]


def _hi_month(d: date) -> str:
    return f"{_HI_MONTHS[d.month - 1]} {d.year}"


def _join(names: list[str], word: str) -> str:
    return names[0] if len(names) == 1 else f"{', '.join(names[:-1])} {word} {names[-1]}"


def replies(r: CheckReport) -> Reply:
    first = r.first_seen
    if r.verdict.label == "no_history" or first is None or first.date is None:
        return Reply(
            en="🔎 No earlier copies of this photo were found online. That doesn't prove it is new, "
               "so please check before forwarding. Checked with First Seen.",
            hi="🔎 इस तस्वीर की कोई पुरानी कॉपी इंटरनेट पर नहीं मिली। इसका मतलब यह नहीं कि तस्वीर नई है, "
               "इसलिए आगे भेजने से पहले जाँच लें। First Seen से जाँचा गया।",
        )

    old = r.verdict.label == "older_than_claimed"
    en = ("⚠️ This photo is not new." if old else "ℹ️ About this photo:") + (
        f" It has been online since at least {first.date:%B %Y} ({first.domain}),"
        f" and Google Lens finds it on {r.domains} websites.")
    hi = ("⚠️ यह तस्वीर नई नहीं है।" if old else "ℹ️ इस तस्वीर के बारे में:") + (
        f" यह कम से कम {_hi_month(first.date)} से इंटरनेट पर है ({first.domain}),"
        f" और Google Lens को यह {r.domains} वेबसाइटों पर मिली।")

    if r.falsely_shared_as:
        places = r.falsely_shared_as[:3]
        en += f" It has been passed off before as {_join(places, 'and')}."
        hi += f" इसे पहले भी {_join(places, 'और')} की तस्वीर बताकर फैलाया गया है।"

    desks = list(dict.fromkeys(f.publisher for f in r.fact_checks if fact_checker_of(f.link)))[:2]
    others = list(dict.fromkeys(f.publisher for f in r.fact_checks if not fact_checker_of(f.link)))[:2]
    if desks:
        en += f" Already fact-checked by {_join(desks, 'and')}."
        hi += f" {_join(desks, 'और')} इसकी जाँच करके इसे गलत बता चुके हैं।"
    elif others:
        en += f" Already called out by {_join(others, 'and')}."
        hi += f" {_join(others, 'और')} इसे पहले ही फ़र्ज़ी बता चुके हैं।"

    return Reply(en=en + " Checked with First Seen.", hi=hi + " First Seen से जाँचा गया।")
