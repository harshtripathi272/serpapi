# Ideas we tested and dropped

Before building, we ran a cheap go/no-go test for each idea against live SerpApi data.
Two failed. The scripts are kept because they show why.

## RingCheck: review-farm detection on Google Maps (`ringcheck_go_nogo.py`)

The idea: a business's 5-star reviewers who also 5-starred the same unrelated businesses in
other cities are a review farm. Google Maps Reviews gives reviewer IDs, and Google Maps
Contributor Reviews (`num=200`) gives each reviewer's history in one call.

The test cost 46 searches: the top-rated packers and movers in Bengaluru, hair-transplant
clinic in Delhi and IVF centre in Hyderabad, 2 review pages each, and up to 15 reviewer
histories per business.

- 58-77% of 5-star reviews came from accounts with 2 or fewer reviews in total, and only
  1 of 37 expanded reviewers had more than 10.
- No far-away place was shared even by 2 reviewers. In Bengaluru, 12 reviewers had
  reviewed 83 other places with no overlap at all.
- The only overlaps were the same business under a second listing: the same clinic at
  its old address, or a doctor's own listing.
- The newest reviews were spread over 85-187 days, with at most 4-8 in any 72 hours.

The reviews looked solicited from real customers, not bought from a farm. There was no
graph to draw.

## Asli: checking Instagram shops (`asli_go_nogo.py`)

The idea: take an Instagram shop's product photos, find the same items elsewhere with
Google Lens, and show the markup.

The test cost about 45 searches across 4 shops, a brand control and diagnostics.

- Shops found through Google posted Reels: 11-12 of their latest 12 posts were videos.
- `type=products` with `country=in` returned no results for any image, including the
  brand's.
- Visual matches rarely carried INR prices: 3 of 59 on a shop's reel cover.

What did work: Instagram photos through SerpApi's image URLs, free Image API uploads, and
dated exact matches. Those dated exact matches became First Seen.
