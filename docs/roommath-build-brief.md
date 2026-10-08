# RoomMath: a second SerpApi hackathon entry

Prepared on 2026-10-09 after reading the local Claude conversation, the current First Seen documentation, the official competition rules and terms, the 190-project SerpApi gallery, and the relevant API documentation. This is a proposed separate project, not a change to First Seen.

**Recommendation.** Build a group accommodation optimizer that compares one large entire home with two nearby smaller entire homes for the same dates and party. Rank actual combinations by quoted trip cost and walking time, subject to bedroom and quality requirements. The first user is the person organizing accommodation for eight adults on a weekend trip.

**The insight.** Searching for eight guests hides homes that accommodate four. Two smaller homes may offer the required bedrooms for less money. Finding a usable pair requires joining separate guest-count searches, checking different listing IDs, adding trip quotes, and checking the route between properties. The output is a concrete tradeoff the organizer can share with the group.

**Positioning refinement, October 9.** Lead with "What is the price of staying together?" Show the observed one-home option beside cheaper split options, with the extra amount required to keep everyone under one roof. Let the organizer change the walking limit and see which plans remain. This is a recommendation based on the existing evidence file; the follow-up research did not refresh the accommodation quotes or spend SerpApi credits.

**Competition fit.** Choose Travel & Local Discovery. The official deadline is October 10, 2026 at 23:59 IST. Submit through GitHub authentication with a public repository, setup instructions, a demo under three minutes showing local functionality, participant details, SerpApi usage explanation, existing-project disclosure, AI-tool disclosure, and accepted rules/terms. Drafts do not qualify until submitted. Each account supports three active projects. Each project may receive one competitive award. Report actual contributors truthfully for the two entries.

Judging considers idea strength, originality, technical complexity, usefulness, and meaningful SerpApi use without fixed weights. Visual/video production quality does not affect judging. A clear result early in the demo is a strategy, not a published judging preference. More engines are not automatically better.

Sources: [rules](https://serpapi.github.io/serpapi-india-hackathon-2026/rules.html), [terms](https://serpapi.github.io/serpapi-india-hackathon-2026/terms.html), [event](https://serpapi.github.io/serpapi-india-hackathon-2026/).

**Measured feasibility, not a promised saving.** Four Airbnb searches and two successful Directions searches tested two destinations for November 13-15, 2026. The queries compared eight adults needing at least four bedrooms against four adults needing at least two bedrooms, with entire-home and minimum-two-bathroom filters. Local analysis additionally required rating >=4.5 and at least 10 reviews. Both sides used the same dates and INR quotes.

| Observed option | Quoted two-night total | Comparison |
| --- | ---: | --- |
| Coorg: cheapest qualifying single home observed | INR 19,114 | Coffee Plantation Estate near Cauvery River, 5BR |
| Coorg: cheapest nearby pair observed | INR 14,437 | Coorg Eshwari Inn + Nisarga homestay; 16-minute walking route between returned coordinates |
| Coorg: tested closer pair | INR 15,312 | Srishti Homestay + Hidden Gem of Madikeri City Centre; 5-minute walking route between returned coordinates |
| Goa: cheapest qualifying single home observed | INR 26,045 | 4BHK 5AC 100mbps Villa 350mtr fm Candolim Beach |
| Goa: cheapest nearby pair observed | INR 22,879 | Nature Bliss 2BHK + Idyllic Abode 2 bhk; route not tested |

The closer Coorg pair saves INR 3,802, about 19.9%, against the observed single-home baseline. The cheaper pair saves INR 4,677 but fails a ten-minute walking limit. Its pins are about 0.56 km apart in a straight line, while the route is 1.1 km. This is why Directions matters.

These are alternatives within the first 18 results of each query, not exhaustive market minima or identical accommodation experiences. The single-home option has a shared living space; the pair requires two reservations and separates the group. Search-returned coordinates may approximate listing locations. Route times are between those coordinates, not verified door-to-door times. Quotes and availability can change; search does not reserve either property. Exact sleeping arrangements, final checkout price and access should be confirmed at the listing.

See `docs/roommath-feasibility.json` for compact observations, listing links, request parameters and search timestamps. Raw responses were saved outside this repository under the local temporary directory and contain no deliberately copied credentials. Do not distribute raw response archives without reviewing them.

**Originality check.** The gallery includes group-trip and itinerary tools, including HermigoBot, TripWeaver and Voyage AI. I found no description there of a simultaneous multi-home optimizer based on guest partitions and route constraints. This is a gallery check, not proof of worldwide novelty. Airbnb's own Split Stays joins consecutive stays across time; RoomMath divides the party across simultaneous stays. Individual hosts already offer combined apartments, so do not claim that renting multiple homes is new.

Sources: [gallery](https://serpapi.github.io/BuiltWithSerpApi/), [Airbnb Split Stays](https://www.airbnb.com/help/article/3223).

**Originality correction from follow-up research.** [HomeRunner Group Stays](https://homerunner.io/blog/group-stays/), announced September 4, 2026, already combines nearby homes for large groups, supports distance limits, and provides comparisons and a shareable booking checklist. The broader multi-home concept therefore has a direct commercial precedent. HomeRunner describes searching a property manager's existing listings. RoomMath's proposed distinction is a traveler-facing search across Airbnb results, a single-home price baseline, and route-based walking constraints with explicit quote evidence. Do not claim to have invented group splitting or that the idea has no competitors. The earlier gallery-only check was insufficient for that conclusion.

**Why choose this over the other directions.** RingCheck and Asli already failed live tests in this workspace. Peak's proposed occupancy inference is invalid: absence from a relevance-ranked result sample does not establish that a property is booked. The existing Coorg probes also contain only three common listing IDs between their two date searches, with two unchanged prices and one approximately 1.8% change. They do not establish a holiday surge. A pricing assistant would also face direct competition from PriceLabs, which already offers nearby comparable listings and price explanations. RoomMath has a simpler verifiable result and a fresh live-data test.

First Seen remains the more mature entry and has a strong public-interest story. RoomMath has a clearer money-saving result and fewer inference steps. That does not establish that judges will rank it higher. Keep both entries distinct and finish both demos.

**MVP contract.** Start with an eight-adult group and a fixed 4+4 partition. Allow destination, dates, required bedrooms, minimum rating and maximum walking time. Expand other group partitions only after this flow works.

Required behavior:

- Fetch single-home results for eight adults and at least four bedrooms.
- Fetch smaller-home results for four adults and at least two bedrooms.
- Use identical check-in/check-out dates, currency and relevant amenity/quality filters.
- Apply the same user-selected geographic boundary to both cohorts. Show each option's location and relevant amenities beside the price. The recorded plantation home and central Madikeri pair are different experiences; the quoted difference does not establish a like-for-like discount. An optional landmark constraint can narrow comparisons after the basic flow works.
- Validate dates, quoted price basis, required fields, bedrooms, review thresholds and coordinates. Missing requirements produce an exclusion or unknown status, not an invented value.
- Enumerate unordered pairs of distinct listing IDs. Each candidate must separately have been returned for the four-person query. Never infer guest capacity from bed count alone.
- Add the two quoted trip totals. Keep the original qualifier and a per-person calculation separate; do not compare a nightly price with a trip total.
- Use straight-line distance only to shortlist pairs. Check walking routes for a small number of candidates before claiming they meet a walking-time limit.
- Distinguish checked pairs from unchecked ones. A cheapest checked pair is not necessarily the cheapest feasible pair unless all potentially better candidates have been evaluated.
- Present a small set of options showing price, route, bedrooms, ratings, review counts, the single-home baseline, listing links and quote timestamps.
- Label the difference as the extra quoted cost of the observed single-home option. Show alternatives that trade price against walking time; do not collapse the decision into an unexplained score. If no valid single-home baseline exists, show split options without calculating savings.
- Explain the shared-space versus separation tradeoff. A split option must not be presented as categorically better for every group.
- Show live/cache/replay status and search count. Replay works without a key with a visible capture timestamp.
- Provide a copyable group summary with the two source links. No messaging integration is necessary.
- Handle no suitable pair honestly. Show the single-home option or say the observed result sample does not contain a matching plan.

**API calls, verified parameter names.**

```json
{
  "engine": "airbnb",
  "q": "Madikeri, Karnataka, India",
  "check_in_date": "2026-11-13",
  "check_out_date": "2026-11-15",
  "adults": 8,
  "currency": "INR",
  "room_type": "entire_home",
  "bedrooms": 4,
  "bathrooms": 2,
  "page": 1
}
```

Repeat with `adults=4` and `bedrooms=2`. Relevant result fields are `listing_id`, `name`, `link`, `extracted_price`, `price_qualifier`, `check_in_date`, `check_out_date`, `bedrooms`, `beds`, `bathrooms`, `rating`, `reviews`, and `gps_coordinates`. Always validate fields at runtime. Documentation supports up to 18 results per page and up to 15 pages; exhausting all pages is outside the MVP.

```json
{
  "engine": "google_maps_directions",
  "start_coords": "12.4222,75.7442",
  "end_coords": "12.41733,75.74307"
}
```

Coordinates above are the returned coordinates for the measured sixteen-minute Coorg pair. Use the coordinates of the selected listings from the evidence or current search. Add `travel_mode=2`, `distance_unit=0`, `gl=in`, `hl=en`. Use `directions[].duration` in seconds and `formatted_duration` for display. If routing fails, keep that option unverified. Do not send all pairs to Directions.

Sources: [Airbnb API](https://serpapi.com/airbnb-search-api), [Directions API](https://serpapi.com/google-maps-directions-api).

**Architecture.** Use a fresh repository and fresh implementation. Next.js/TypeScript for the form, comparison cards and map; FastAPI/Python for validation and pair enumeration; SQLite for timestamped response caching; JSON fixtures for explicit replay. Query the two Airbnb cohorts concurrently. With 18 smaller-home results there are only 153 unordered pairs, so exhaustive local pair enumeration is enough; an LLM, GPU and elaborate optimizer are unnecessary. Store keys server-side. Keep live cache expiry explicit for volatile accommodation quotes.

Suggested files: `backend/roommath/{models,serp,search,pairs,routes,api}.py`, `backend/tests/`, `backend/fixtures/`, `web/app/`, `web/components/{SearchForm,PlanCard,TradeoffSlider,EvidenceDrawer,StayMap}.tsx`, `docs/method.md`, `docs/demo-script.md`.

**Credit budget.** One bounded scan uses two Airbnb searches plus up to three route checks, about five searches before caching. An optional second page for each Airbnb cohort adds two. Budget approximately 30-60 searches for development, fixtures and recording. The existing First Seen account reported 132 remaining before this research and 128 after the first successful route; these are point-in-time account reads, not a promised current balance. One further route was fetched afterward. Use the second entrant's account for their implementation.

**Build in 20-24 focused hours.**

| Hours | Backend owner | UI owner |
| --- | --- | --- |
| 0-3 | Typed report and fixture replay from the measured examples | Form, option cards and evidence drawer against that report |
| 3-8 | Two-cohort search, validation, pair enumeration, timestamped cache | Comparison view, route display and walking-limit control |
| 8-13 | Bounded route verification, exclusions, error states | Map, source links, quote timestamps and copyable summary |
| 13-17 | Integration and meaningful invariant tests | Loading, empty and replay states; responsive layout |
| 17-21 | Fresh-clone setup verification and docs | Record under-three-minute local demo |
| 21-24 | Submit and keep buffer for link/setup failures | Verify public access to repo and demo |

Meaningful tests should cover wrong price bases, duplicated listing IDs, missing capacity evidence, date mismatches, exclusion by route limit, no feasible pair and replay without a key.

Cut hotels, flights, attraction discovery, auth, payments, booking automation, LLM prose, three-property plans and monitoring. Google Hotels does expose trip totals, but multi-room inventory and room layouts need additional validation, so it should not be part of the initial demo.

**Demo, 2:40.** Open with eight people needing four bedrooms. Show the recorded Coorg comparison as a clearly labeled snapshot. Run one visible current scan, with whatever result it actually returns. At 0:30 show the single-home total and split alternatives. At 1:00 change the walking limit from twenty to ten minutes: the measured sixteen-minute pair drops out and the five-minute pair remains. At 1:25 open the evidence: two separate four-person queries, room counts, dates, quoted totals and route response. At 1:55 copy the group summary. At 2:15 show replay without a key and the API/search budget. Finish by 2:40. Do not promise the old prices on a fresh live run.

**Submission description.** RoomMath helps the person organizing a group trip decide whether to book one large home or two nearby smaller homes. It searches the same dates for the full party and for smaller groups, combines distinct listings that meet bedroom and quality requirements, adds their quoted trip costs, and checks walking routes between them. The result shows the money saved and the inconvenience accepted, with source links and quote timestamps. SerpApi's Airbnb Search API supplies the listings, guest-specific quotes and room details; Google Maps Directions verifies proximity. Users can adjust their walking limit and compare the resulting options. The app runs locally and includes labeled replay examples without an API key.

**Handoff to Lux.** Build RoomMath as a separate project using this brief and `docs/roommath-feasibility.json`. Complete the fixed eight-adult, four-bedroom, 4+4 flow first. Preserve the distinction between observed quotes and guaranteed booking prices, and between approximate listing coordinates and door-to-door routes. Use the measured Coorg alternatives for labeled replay, but show the actual result of a current live run. Implement deterministic validation and pair enumeration, source-linked evidence, route constraints, bounded credits and reproducible setup. Keep the existing First Seen app outside the implementation scope.
