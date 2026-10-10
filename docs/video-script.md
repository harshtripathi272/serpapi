# First Seen: demo video script

1920×1080, 30 fps, about 2:20 (limit 3:00). Built in Remotion (`video/`), from real screenshots
of the app captured at phone size, with a voiceover and on-screen captions. One live run, as the
brief asks: the Chennai check runs live, and "How we checked" shows the three searches as live.

Look: the app's own palette (warm off-white canvas, ink text, one orange accent #fc5a1e), Plus
Jakarta Sans, a phone frame for the app, large type. Entrances 300–600 ms on springs, quicker
exits, related items staggered, cross-fades between scenes, slow drift while holding.

| # | Scene | On screen | Voiceover |
|---|---|---|---|
| 1 | Hook | A dark chat. A forwarded message slides in: the flooded-airport photo, "Ahmedabad airport flooded today 😱 Forward to all", tagged *Forwarded many times*. | This landed in my family group this morning. Ahmedabad airport, flooded today. Is it real? |
| 2 | Problem | Big type, one line at a time: "Most viral photos aren't fake." / "They're old." / "Checking takes effort. So nobody checks." | Most viral photos aren't fake. They're old photos with a new caption. And checking takes effort, so nobody does. |
| 3 | Intro | Logo mark, "First Seen", tagline. | So we built First Seen. Before you forward it, see where it's been. |
| 4 | Input | Phone: home screen, then the link and the claim filled in, the button pressed. Label: *Live run*. | Paste the photo or its link, and what the message claims. This is a live run. |
| 5 | Three searches | Phone: the tracker ticking. Beside it, three cards light up in turn: Google Lens exact matches, Google Lens similar images, Google News past week. "3 SerpApi searches, in parallel". | First Seen runs three SerpApi searches at once. Google Lens finds every copy of this exact image, with the date Google shows for each page. Similar images finds the fact-checks. And Google News checks whether it's happening right now. |
| 6 | Verdict | Phone: the verdict. Callouts: "62 copies · 39 websites", "Earliest: NDTV, 2 Dec 2015". | The answer: online since at least December 2015. It's Chennai airport in the 2015 floods, and NDTV had it the same day. |
| 7 | How it decides | A time axis. The 50 dated copies from the live search drop in as dots, by day (2 on 12 Mar 2015; 22, 15, 4, 2 and 1 on 2, 3, 4, 6 and 7 Dec 2015). Two dots in March 2015 turn grey: "too few sites agree". The December 2015 cluster rings: "3 sites within 30 days". | Dates on the web are messy. Two pages say March 2015, months before the flood. So First Seen only trusts a date when three different sites agree within thirty days. It can understate a photo's age, but it never overstates it. |
| 8 | Past lives | Phone scrolls to Past lives and the fact-check cards. Chips: Cyclone Michaung, Ahmedabad airport. BOOM's fact-check card. | Fact-checkers have seen it before. It's been passed off as Cyclone Michaung, and even as Ahmedabad airport. BOOM already called that one out. |
| 9 | News and reply | Phone: "Is it happening now?" with no matching news. Then the reply sheet switches to Hindi. | There's no flood at Ahmedabad airport in this week's news. Then it writes a polite reply for the group, in English or Hindi, ready to share. |
| 10 | Everywhere | Left: a right-click menu on a chat photo, "Check with First Seen". Right: a video's scenes, each with its own date. | It works where forwards actually live. Right-click any image, even on WhatsApp Web. Or forward a video to the Telegram bot: it splits the video into scenes and dates each one. |
| 11 | Under the hood | Phone: "How we checked", each search marked live or cached. Beside it: "Cached, so repeat checks are free" and "Replay mode: every example runs without a key". | Every search is listed, marked live or cached. Repeat checks cost nothing, and a replay mode runs every example without an API key. |
| 12 | Outro | Logo, tagline, github.com/harshtripathi272/serpapi, "Built on SerpApi". | First Seen. Before you forward it, see where it's been. |

## Assets

Captured with `video/scripts/capture.mjs` (Playwright driving the installed Chrome, 390×844
viewport at 3× scale) from the production build:

- `home.png`, `home-filled.png`: home, empty and with the Chennai link and claim.
- `tracking-1.png` … `tracking-4.png`: the tracker as each step completes.
- `result.png`: the full Chennai result page, tall, for scrolling inside the phone.
- `reply-en.png`, `reply-hi.png`: the reply sheet.
- `how.png`: "How we checked" opened.
- `video-result.png`: the result for `demo-assets/slideshow-forward.mp4`.
- `photo.jpg`: the Chennai photo itself.

The live run changed two facts from the cached data: 62 copies instead of 63, and BOOM's
fact-check showing the photo was passed off as Ahmedabad once before, so line 8 was rewritten
to match the screen.

Sound: `video/scripts/cues.ts` exports `video/audio/cues.json` from the film's timing, and
[opus-sound-layer](https://github.com/Bodila51/opus-sound-layer) mixes the voice, a quiet chord
pad (`public/pad.mp3`, made with ffmpeg) and CC0 effects, then checks the result.

The voiceover is generated per scene with edge-tts (Microsoft neural voice, `en-IN`), and each
scene lasts as long as its line plus a short pause.
