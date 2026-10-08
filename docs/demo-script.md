# Demo video script (target 2:50, limit 3:00)

Record at 1080p. Run the backend in `cache` mode, so the first check is live and the rest are
instant. At the end of the live check, open **How we checked** at the bottom of the result to
show each SerpApi search marked *live* or *cached*. The hackathon brief asks for this: "Show
one live run; label any saved demo data."

Run the web app as a production build for the recording (`npm run build && npm start`); it is
smoother than dev mode. If your screen recorder drops frames during animations, open the app
once with `?static=1` to switch animations off for that browser session (`?static=0` turns
them back on).

Before recording:

- Clear the cache entry for the Chennai example, so its first run is visibly live:
  3 searches.
- Install the extension, and open WhatsApp Web with a chat containing the shark photo
  (send it to yourself).
- Have the Telegram bot running and `demo-assets/slideshow-forward.mp4` saved on the
  phone. Telegram Desktop works too.

| Time | On screen | Say |
|---|---|---|
| 0:00–0:10 | A WhatsApp forward: flooded airport photo, "Ahmedabad airport flooded today 😱 forward to all" | "This landed in my family group this morning. Is it real?" |
| 0:10–0:30 | Paste the link and claim into First Seen. The log shows Lens exact matches, Lens similar images and Google News running together. The meter reads 3. | "First Seen asks SerpApi's Google Lens for every copy of this exact image online, and the date Google shows for each." |
| 0:30–0:45 | Verdict: **Online since at least Dec 2015, not new**. 63 copies, 39 websites. | "It's Chennai airport in December 2015. The earliest well-attested copy is NDTV's, from the day of the flood." |
| 0:45–1:00 | Past lives. Passed off as Cyclone Michaung, Hurricane Harvey, Houston. Called out by ABP News and News.com.au. No news this week matches. | "It's been passed off as Houston during Hurricane Harvey, and as Cyclone Michaung. And there's no flood at Ahmedabad airport in the news this week." |
| 1:00–1:15 | Reply card. Switch to हिंदी, Copy message, Download image. | "The correction goes back the way the rumour came, in English or Hindi." |
| 1:15–1:35 | WhatsApp Web: right-click the shark photo, choose **Check with First Seen**, type the claim, and a new tab opens with the result: since at least Aug 2011, Irene → Harvey → Florence, fact-checked by Snopes and Newschecker. | "It works where the forwards actually are. Right-click any photo on WhatsApp Web." |
| 1:35–2:00 | Telegram: forward `slideshow-forward.mp4` to @Firstyseen_bot. The reply checks 2 scenes, each with its own date: 0:00 since Aug 2011, 0:06 since Oct 2011. | "Most forwards are videos. First Seen splits a video into scenes and dates each one. This slideshow is two old hoaxes back to back." |
| 2:00–2:30 | README, "How it decides". Point at the two March 2015 pages being ignored. | "Dates on the web are messy. First Seen trusts a date only when three sites agree, so it can understate a photo's age but never overstate it. Three SerpApi searches per photo, all cached, plus a replay mode so you can run every example without a key." |
| 2:30–2:45 | Repo URL and the line "Before you forward it, see where it's been." | |

Cut first if long: the extension segment (1:15–1:35), since the shark is also shown in the
video segment.
