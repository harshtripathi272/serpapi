"""Telegram bot: forward a photo (claim as caption, optional), get First Seen's verdict back.

Long polling, so it runs on a laptop with no public URL.

    1. Create a bot with @BotFather and put TELEGRAM_BOT_TOKEN=... in backend/.env
    2. python -m firstseen.telegram_bot
"""
from __future__ import annotations

import asyncio
import html
import os
import re
import sys
import time

import requests

from .models import CheckReport
from .provenance import CheckError, CheckInput, run_check
from .serp import SerpClient, SerpError

API = "https://api.telegram.org"
_URL = re.compile(r"https?://\S+")
WELCOME = (
    "Forward me a photo from WhatsApp or anywhere else. Add what the message claims as the caption if you like.\n"
    "I'll tell you where it appeared online before, and when.\n\n"
    "कोई भी फ़ॉरवर्ड की गई तस्वीर भेजें। मैं बताऊँगा कि यह पहले इंटरनेट पर कहाँ और कब दिखी थी।"
)


def format_reply(r: CheckReport) -> str:
    """Telegram HTML: the verdict, the evidence in three lines, then the message to forward, in English and Hindi."""
    lines = [f"<b>{html.escape(r.verdict.headline)}</b>"]
    if r.first_seen and r.first_seen.date:
        lines.append(f"{r.total_matches} copies on {r.domains} websites. "
                     f"Earliest well-attested: {html.escape(r.first_seen.domain)}, "
                     f"{r.first_seen.date.day} {r.first_seen.date:%b %Y}.")
    lives = [c.label for c in r.contexts if c.kind != "event"][:5]
    if lives:
        lines.append("Past lives: " + html.escape(" → ".join(lives)))
    if r.falsely_shared_as:
        lines.append("Passed off before as: " + html.escape(", ".join(r.falsely_shared_as[:4])))
    publishers = list(dict.fromkeys(f.publisher for f in r.fact_checks))[:3]
    if publishers:
        lines.append("Called out by: " + html.escape(", ".join(publishers)))
    if r.reply:
        lines += ["", "<b>Forward this:</b>", html.escape(r.reply.en), "", "<b>हिंदी में:</b>", html.escape(r.reply.hi)]
    return "\n".join(lines)


class Bot:
    def __init__(self, token: str, client: SerpClient):
        self.base = f"{API}/bot{token}"
        self.files = f"{API}/file/bot{token}"
        self.client = client
        self.session = requests.Session()

    def call(self, method: str, **params):
        resp = self.session.post(f"{self.base}/{method}", json=params, timeout=60)
        resp.raise_for_status()
        return resp.json()["result"]

    def photo_bytes(self, photos: list[dict]) -> bytes:
        largest = max(photos, key=lambda p: p.get("file_size") or p["width"] * p["height"])
        path = self.call("getFile", file_id=largest["file_id"])["file_path"]
        resp = self.session.get(f"{self.files}/{path}", timeout=60)
        resp.raise_for_status()
        return resp.content

    def handle(self, message: dict) -> None:
        chat = message["chat"]["id"]
        text = message.get("caption") or message.get("text") or ""
        if text.strip() in ("/start", "/help"):
            self.call("sendMessage", chat_id=chat, text=WELCOME)
            return
        url = _URL.search(text)
        if not message.get("photo") and not url:
            self.call("sendMessage", chat_id=chat, text="Send a photo, or a link to one.")
            return
        self.call("sendChatAction", chat_id=chat, action="typing")
        claim = _URL.sub("", text).strip() or None
        try:
            if message.get("photo"):
                inp = CheckInput(image=self.photo_bytes(message["photo"]), claim=claim)
            else:
                inp = CheckInput(image_url=url.group(0), claim=claim)
            report = asyncio.run(run_check(inp, self.client, lambda e: None))
            reply = format_reply(report)
        except (CheckError, SerpError) as e:
            reply = f"Couldn't check that: {html.escape(str(e))}"
        self.call("sendMessage", chat_id=chat, text=reply, parse_mode="HTML", disable_web_page_preview=True,
                  reply_to_message_id=message["message_id"])

    def run(self) -> None:
        me = self.call("getMe")
        print(f"First Seen bot running as @{me['username']} (SerpApi mode: {self.client.mode}). Ctrl+C to stop.")
        offset = None
        while True:
            try:
                updates = self.session.get(f"{self.base}/getUpdates",
                                           params={"timeout": 30, "offset": offset}, timeout=45).json()
            except requests.RequestException as e:
                print(f"poll failed, retrying: {e}")
                time.sleep(3)
                continue
            for update in updates.get("result", []):
                offset = update["update_id"] + 1
                message = update.get("message") or update.get("channel_post")
                if message:
                    try:
                        self.handle(message)
                    except requests.RequestException as e:
                        print(f"reply failed: {e}")


def main() -> int:
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except ImportError:
        pass
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        print("Set TELEGRAM_BOT_TOKEN in backend/.env (create a bot with @BotFather first).")
        return 2
    Bot(token, SerpClient()).run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
