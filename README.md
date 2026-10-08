# First Seen

See where a forwarded photo appeared online before, and when.

Recycled photos are the cheapest misinformation there is. An old flood photo becomes
"today's floods", and a 2011 hoax comes back every monsoon. First Seen asks Google Lens,
through SerpApi, for every page that carries the exact same image. It reads the date
Google shows for each page and lays them out on a timeline. Each check is one SerpApi
search.

Three live results from October 2026:

- **"Ahmedabad airport flooded today"**: the photo is Chennai airport on 2 Dec 2015, which
  Times of India and Factly have both debunked when it was recirculated. First Seen finds
  63 copies, 47 of them online by the end of 2015, the earliest well-attested one on
  ndtv.com that same day. Two pages dated March 2015 are flagged as unreliable, since too
  few sites agree on those dates.
- **"NASA's photo of India on Diwali night"**: 393 copies, 227 of them dated, online since
  at least October 2011, with scattered pages dated back to 2007. PetaPixel and Core77
  debunked it in 2011, and Telugu and Malayalam sites were still listing it as a hoax in
  2015 and 2016.
- **"Shark on the highway in today's floods"**: 399 copies, the earliest dated 24 Aug 2011
  (Hurricane Irene). It came back for Hurricane Harvey in 2017 and Florence in 2018,
  and a Tamil page in 2016 listed it among the hoaxes that fooled people in 2015.

## How it uses SerpApi

| API | Why | Searches per check |
|---|---|---|
| Google Lens API, `type=exact_matches`, `country=in` | every page showing this exact image, with the date Google shows for it | 1 |
| Image API | upload a photo saved from WhatsApp or a phone, when there's no public URL | 0 (uploads didn't use search credits when we measured) |

Results are cached by image URL, or by the SHA-256 of the uploaded bytes, so checking the
same photo twice costs nothing.

## Layout

```
backend/firstseen/   provenance.py (the check), dates.py (Lens date parsing), serp.py (SerpApi,
                     cache, replay), images.py, models.py, api.py (FastAPI + SSE), examples.json
backend/fixtures/    recorded Lens responses for the two examples, used by replay mode
backend/tests/       pytest suite
web/                 Next.js app
scripts/             seed_cache.py, record_fixtures.py
experiments/         two ideas we tested against live data and dropped (see its README)
docs/method.md       how dates and verdicts are worked out, and the limits
```

## Run it

Backend, Python 3.11+ (PowerShell shown; on macOS/Linux use `source .venv/bin/activate`):

```
cd backend
uv venv; uv pip install -e ".[dev]"
copy .env.example .env        # then set SERPAPI_API_KEY in .env
.venv\Scripts\activate
uvicorn firstseen.api:app --port 8000
```

Web:

```
cd web
npm install
copy .env.example .env.local
npm run dev                   # http://localhost:3000
```

### Without an API key

Set `SERPAPI_MODE=replay` in `backend/.env`. The two example buttons on the home page then
run from `backend/fixtures/` with no network calls and no key.

## Tests

```
cd backend
.venv\Scripts\python -m pytest
```
