# How First Seen dates a photo

1. **Find copies.** One Google Lens API call with `type=exact_matches` and `country=in`.
   An image URL goes straight to Lens. If Lens can't open the URL, or the user uploaded a
   file, the backend shrinks the image under 500 KB, uploads it with SerpApi's Image API,
   and searches by `image_id`.
2. **Read dates.** Lens shows a date on most exact matches. Formats seen: `30 Sept 2022`,
   `Today`, `1 day ago`, `5 days ago`. Relative dates are resolved against the time
   SerpApi ran the search (`search_metadata.created_at`), so a replayed result dates the
   same way it did live. See `backend/firstseen/dates.py`.
3. **Timeline.** Dated copies are grouped by year. For each year the report keeps up to 3
   copies from different sites, which shows what the photo was said to be that year.
4. **First seen.** The earliest dated copy. One old page can mislead (it may be misdated,
   or have added the image later), so the report also gives the year by which 5 dated
   copies existed.
5. **Verdict.**
   - *Older than claimed:* the claim says the photo is new ("today", "just", "aaj", "abhi",
     "breaking"...) and the first copy is more than 30 days old, or the claim names a year
     later than the first copy.
   - *First seen:* there are dated copies but the claim doesn't conflict, or there is no claim.
   - *No history:* no dated copies. That fits an original photo, or one too new to be indexed.

## Limits

- Lens only finds pages Google has indexed. "No history" doesn't prove a photo is new.
- The date is the page's date as Google shows it, not when the photo was taken.
- Exact matches miss heavy crops and edits. A cropped or recoloured copy may be absent.
- `country=in` favours pages Google shows to Indian users. Most of the global copies still
  appear, but the ranking may differ.
