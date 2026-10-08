# Demo video script (target 2:45, limit 3:00)

Record at 1080p. Run the backend in `cache` mode so one check is live and the rest are
instant, and keep the credit meter visible (top right) so judges can see which runs are
live and which are cached. The hackathon's own brief asks for exactly that: "Show one live
run; label any saved demo data."

Before recording:

- Clear the cache entry for the Chennai example, so its first run is visibly live:
  3 searches.
- Have Telegram Desktop or a phone mirror open with the bot running.
- Have the NASA photo saved to the phone.

| Time | On screen | Say |
|---|---|---|
| 0:00–0:10 | A WhatsApp-style forward: flooded airport photo, "Ahmedabad airport flooded today 😱 forward to all" | "This was forwarded to my family group this morning. Is it real?" |
| 0:10–0:30 | Paste the link and claim into First Seen. The progress log shows Lens exact matches → Lens similar images → Google News. The credit meter ticks to 3. | "First Seen asks SerpApi's Google Lens for every copy of this exact image online, and the date Google shows for each." |
| 0:30–0:45 | Verdict card: **Online since at least Dec 2015, not new**. 63 copies, 39 websites. | "It's Chennai airport in December 2015. The earliest well-attested copy is NDTV's, from the day of the flood." |
| 0:45–1:05 | Scroll: past lives. Chips: passed off as Cyclone Michaung, Hurricane Harvey, Houston. Called out by ABP News and News.com.au. "Is this happening now? No news from the past week matches." | "It's been passed off as Houston during Hurricane Harvey, and as Cyclone Michaung. Fact-checkers have already called it out. And there's no flood at Ahmedabad airport in the news this week." |
| 1:05–1:25 | Reply card. Switch to हिंदी, click Copy message, click Download image. | "The correction goes back the way the rumour came: a message and an image card, in English or Hindi." |
| 1:25–1:50 | Telegram: forward the NASA Diwali photo to the bot. The reply arrives: online since at least Oct 2011, fact-checked by BOOM and Fact Crescendo. | "Or skip the website. Forward the photo to the Telegram bot." |
| 1:50–2:10 | Web: the shark example (cached, 0 searches). Past lives timeline: Irene 2011 → Houston → Harvey 2017 → Florence 2018. Titles in 6 scripts. | "Some photos have long careers. This shark has been in four hurricanes since 2011." |
| 2:10–2:35 | README "How it decides". Show the two March 2015 pages being ignored. | "Dates on the web are messy. First Seen only trusts a date when three sites agree, so it can understate a photo's age but never overstate it. Three SerpApi searches per check, all cached, and a replay mode so you can run every example without a key." |
| 2:35–2:45 | Repo URL and the line "Before you forward it, see where it's been." | |

Cut first if long: the shark segment (1:50–2:10).
