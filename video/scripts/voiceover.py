"""Generate one voiceover clip per scene with edge-tts, and write their durations.

Run from video/: python scripts/voiceover.py
"""

import asyncio
import json
import subprocess
from pathlib import Path

import edge_tts

VOICE = "en-IN-PrabhatNeural"
OUT = Path(__file__).resolve().parent.parent / "public" / "vo"

LINES = {
    "01-hook": "This landed in my family group this morning. Ahmedabad airport, flooded today. Is it real?",
    "02-problem": "Most viral photos aren't fake. They're old photos, with a new caption. And checking takes effort, so nobody does.",
    "03-intro": "So we built First Seen. Before you forward it, see where it's been.",
    "04-input": "Paste the photo, or its link, and what the message claims. This is a live run.",
    "05-searches": "First Seen runs three SerpApi searches at once. Google Lens finds every copy of this exact image, with the date Google shows for each page. Similar images finds the fact-checks. And Google News checks whether it's happening right now.",
    "06-verdict": "The answer: online since at least December 2015. It's Chennai airport, in the 2015 floods, and NDTV had it the same day.",
    "07-decides": "Dates on the web are messy. Two pages say March 2015, months before the flood. So First Seen only trusts a date when three different sites agree, within thirty days. It can understate a photo's age, but it never overstates it.",
    "08-lives": "Fact-checkers have seen it before. It's been passed off as Cyclone Michaung, and even as Ahmedabad airport. BOOM already called that one out.",
    "09-reply": "There's no flood at Ahmedabad airport in this week's news. Then it writes a polite reply for the group, in English or Hindi, ready to share.",
    "10-everywhere": "It works where forwards actually live. Right-click any image, even on WhatsApp Web. Or forward a video to the Telegram bot. It splits the video into scenes, and dates each one.",
    "11-hood": "Every search is listed, marked live or cached. Repeat checks cost nothing, and a replay mode runs every example without an API key.",
    "12-outro": "First Seen. Before you forward it, see where it's been.",
}


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


async def speak(text: str, path: Path) -> list[dict]:
    """Save the clip and return its words with start and end times in seconds, for captions."""
    words = []
    with path.open("wb") as audio:
        async for chunk in edge_tts.Communicate(text, VOICE, rate="+4%", boundary="WordBoundary").stream():
            if chunk["type"] == "audio":
                audio.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7
                words.append({"text": chunk["text"], "start": round(start, 3), "end": round(start + chunk["duration"] / 1e7, 3)})
    return words


def align(text: str, words: list[dict]) -> list[dict]:
    """Give each timed word its spelling from the script, punctuation included."""
    tokens = text.split()
    bare = lambda s: "".join(ch for ch in s.lower() if ch.isalnum())
    i = 0
    for w in words:
        taken = []
        while i < len(tokens) and bare(" ".join(taken)) != bare(w["text"]):
            taken.append(tokens[i])
            i += 1
        w["text"] = " ".join(taken) or w["text"]
    return words


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    clips = {}
    for name, text in LINES.items():
        path = OUT / f"{name}.mp3"
        words = align(text, await speak(text, path))
        clips[name] = {"duration": round(duration(path), 3), "text": text, "words": words}
        print(name, clips[name]["duration"], len(words))
    (OUT / "clips.json").write_text(json.dumps(clips, indent=2, ensure_ascii=False), encoding="utf-8")


asyncio.run(main())

