# How First Seen checks a photo

Each check makes up to three SerpApi searches. Code: `backend/firstseen/provenance.py`.

## 1. Exact copies and their dates

One Google Lens API call with `type=exact_matches` and `country=in`.

- **Input.** An image URL goes straight to Lens. If Lens can't open the URL, or the user
  uploaded a file, the backend shrinks the image under 500 KB, uploads it with SerpApi's
  Image API, and searches by `image_id`. The upload happens at most once per check.
- **Dates.** Lens shows a date on most exact matches. Formats seen: `30 Sept 2022`,
  `Today`, `1 day ago`, `5 days ago`. Relative dates are resolved against the time
  SerpApi ran the search (`search_metadata.created_at`), so a replay dates the same way.
  See `dates.py`.
- **First seen.** The earliest date that 3 different sites back up within 30 days. Pages
  can be misdated. The December 2015 Chennai airport flood photo has two pages dated March
  2015, nine months before the floods. So the verdict says the photo was online *at
  least* since that date. That can understate the photo's age, but never overstate it.
  Earlier dates that too few sites agree on are reported, not used. The report also
  gives the year by which 5 dated copies existed.

## Videos (`video.py`)

Lens searches images, so a video is checked scene by scene:

1. Sample 2 frames a second, trimming black letterbox and pillarbox bars from each one.
   Bars would otherwise make every scene look alike, and they break exact matching.
2. Start a new scene only when both the colour histogram (correlation below 0.6) and the
   32×32 grayscale layout (below 0.7) change. Codecs sometimes garble a frame's colours,
   and the layout check stops that from splitting a scene.
3. Skip black or flat frames, such as fades and title cards.
4. Keep the sharpest frame (by Laplacian variance) of each of the 3 longest scenes.
5. Date each keyframe separately, in parallel, then merge the copies.

The report lists every scene with its own first-seen date. A WhatsApp slideshow of two old
photos therefore gets two dates.

## 2. Past lives (`contexts.py`)

Each copy's title is tagged with three kinds of label:

- named storms ("Hurricane Harvey", "cyclone Michaung")
- places, from a gazetteer of Indian states and cities plus places viral photos often get pinned to
- events: floods, earthquakes, riots, Diwali and others

Site-name suffixes (" | news.com.au - Australia's leading news site") are stripped first,
and labels on a single copy are dropped as noise. The result is the photo's past lives in
the order they first appeared. Titles are also counted by script (Tamil, Devanagari,
Arabic and others).

## 3. Fact-checks (`factcheck.py`)

A page counts as a fact-check if it is from a known desk or its title uses debunk wording.

- **Known desks.** Indian IFCN signatories such as Factly, BOOM, Alt News, Vishvas News and
  Newschecker, plus Snopes, AFP, Reuters and others.
- **Debunk wording.** Phrases like "fact check", "fake", "hoax", "old photo", "passed off",
  "फर्जी" or "भ्रामक".
- **Social posts are excluded.** A post saying "fake" is often the hoax itself.

Fact-checks are looked for in two places:

- among the exact copies, at no extra cost
- among Lens `visual_matches` (one search), because fact-checkers republish photos stamped
  "FALSE", cropped or in collages, which are similar rather than exact copies

A keyword search for debunks was tried first and dropped. Google returned news coverage
of the event rather than fact-checks, and `site:` filters with OR were ignored.

**Passed off as** lists the storms and places named in fact-check titles, minus those
named by copies from the year the photo first appeared.

## 4. Is it in the news now?

With a claim, one Google Search API call with `tbm=nws` and `tbs=qdr:w` covers the past
week. The query is the claim minus words like "today", "just", "aaj" and "photo". An
article counts only if at least half the claim's keywords (and at least 2) appear in it,
so "90 flights from Ahmedabad" doesn't match "Ahmedabad airport flooded".

## 5. Verdict and reply

- *Older than claimed:* the claim says the photo is new ("today", "just", "aaj", "abhi",
  "आज", "अभी", "breaking"...) and the first well-attested copy is more than 30 days old, or the claim
  names a year later than that copy.
- *First seen:* there are dated copies, but no claim conflicts with them.
- *No history:* no dated copies. That fits an original photo, or one too new to be indexed.

`reply.py` turns the result into a short message in English and Hindi. The web app adds
an image card, and the Telegram bot sends both messages.

## Limits

- Lens only finds pages Google has indexed. "No history" doesn't prove a photo is new.
- The date is the page's date as Google shows it, not when the photo was taken.
- Exact matches miss heavy crops and edits. Visual matches catch some of those, but only
  fact-check pages are taken from them, never dates.
- Tags come from titles, so a debunk's title can name a context the photo itself never had.
- `country=in` favours what Google shows Indian users.
