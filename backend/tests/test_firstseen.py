import asyncio
from datetime import date

import pytest

from firstseen.dates import parse_lens_date, searched_at
from firstseen.images import sha256
from firstseen.provenance import CheckError, CheckInput, lens_hash_params, lens_url_params, run_check
from firstseen.serp import ResponseCache, SerpClient

SEARCHED = date(2026, 10, 8)
URL = "https://example.org/viral.jpg"
IMAGE = b"\xff\xd8 not really a jpeg, only hashed"


def lens_response(dates):
    return {
        "search_metadata": {"created_at": "2026-10-08 17:34:12 UTC"},
        "exact_matches": [
            {"title": f"Post {i}", "source": f"site{i}", "link": f"https://site{i}.example/p/{i}", "date": d}
            for i, d in enumerate(dates)
        ],
    }


VIRAL = lens_response(["30 Sept 2022", "14 Jul 2011", "2 Aug 2011", "Today", "5 days ago", None, "16 Jan 2024"])


def client_with(tmp_path, params, response):
    cache = ResponseCache(tmp_path / "c.sqlite")
    cache.put(params, response)
    return SerpClient(mode="replay", db_path=tmp_path / "c.sqlite", fixtures_dir=tmp_path / "none")


def check(client, **kw):
    events = []
    report = asyncio.run(run_check(CheckInput(**kw), client, events.append))
    return report, events


@pytest.mark.parametrize("text,expected", [
    ("30 Sept 2022", date(2022, 9, 30)),
    ("7 Oct 2024", date(2024, 10, 7)),
    ("Sep 30, 2022", date(2022, 9, 30)),
    ("Today", SEARCHED),
    ("Yesterday", date(2026, 10, 7)),
    ("1 day ago", date(2026, 10, 7)),
    ("5 days ago", date(2026, 10, 3)),
    ("2 weeks ago", date(2026, 9, 24)),
    ("a year ago", date(2025, 10, 8)),
    ("2019", date(2019, 1, 1)),
    ("31 Feb 2020", None),
    ("sometime", None),
    (None, None),
])
def test_parse_lens_date(text, expected):
    assert parse_lens_date(text, SEARCHED) == expected


def test_searched_at_reads_search_metadata():
    assert searched_at(VIRAL) == SEARCHED


def test_old_image_with_recent_claim_is_older_than_claimed(tmp_path):
    client = client_with(tmp_path, lens_url_params(URL), VIRAL)
    report, events = check(client, image_url=URL, claim="Shark on the road in today's floods")
    assert report.verdict.label == "older_than_claimed"
    assert report.first_seen.date == date(2011, 7, 14)
    assert report.total_matches == 7 and report.dated_matches == 6
    assert [y.year for y in report.years] == [2011, 2022, 2024, 2026]
    assert report.years[0].count == 2
    assert report.earliest[0].date == date(2011, 7, 14)
    assert report.credits_used == 0 and events[0].cached
    assert report.widely_shared_by == 2026  # cumulative copies: 2 in 2011, 3 by 2022, 4 by 2024, 6 by 2026


def test_lone_early_date_does_not_set_first_seen(tmp_path):
    # Shaped like the Chennai airport photo: pages dated months before the event, then a burst.
    response = lens_response(["12 Mar 2015", "12 Mar 2015", "2 Dec 2015", "2 Dec 2015", "3 Dec 2015", "10 Dec 2016"])
    client = client_with(tmp_path, lens_url_params(URL), response)
    report, _ = check(client, image_url=URL, claim="flooded today")
    assert report.first_seen.date == date(2015, 12, 2)
    assert report.earliest_uncorroborated.date == date(2015, 3, 12)
    assert report.verdict.headline == "Online since at least Dec 2015, not new"
    assert "too few sites agree" in report.verdict.detail


def test_claim_year_after_first_seen_is_older_than_claimed(tmp_path):
    client = client_with(tmp_path, lens_url_params(URL), VIRAL)
    report, _ = check(client, image_url=URL, claim="Floods in Assam, 2025")
    assert report.verdict.label == "older_than_claimed"


def test_no_claim_reports_first_seen(tmp_path):
    client = client_with(tmp_path, lens_url_params(URL), VIRAL)
    report, _ = check(client, image_url=URL)
    assert report.verdict.label == "first_seen"
    assert report.verdict.headline == "Online since at least 14 Jul 2011"


def test_fresh_image_has_no_history(tmp_path):
    client = client_with(tmp_path, lens_url_params(URL), {"error": "Google Lens hasn't returned any results for this query."})
    report, _ = check(client, image_url=URL, claim="today")
    assert report.verdict.label == "no_history"


def test_uploaded_image_is_found_by_hash_without_uploading(tmp_path):
    client = client_with(tmp_path, lens_hash_params(sha256(IMAGE)), VIRAL)
    report, _ = check(client, image=IMAGE, claim="aaj ki baarish")
    assert report.verdict.label == "older_than_claimed"


def test_replay_refuses_unknown_uploads(tmp_path):
    client = client_with(tmp_path, lens_url_params(URL), VIRAL)
    with pytest.raises(CheckError):
        check(client, image=b"some other image")


def test_fact_checks_come_from_copies_and_similar_images(tmp_path):
    exact = lens_response(["2 Dec 2015", "2 Dec 2015", "3 Dec 2015"])
    exact["exact_matches"].append({"title": "Old photo passed off as Ahmedabad", "link": "https://factly.in/x/",
                                   "date": "5 Dec 2023"})
    similar = {"visual_matches": [
        {"title": "Hoax photo of planes floating at flooded airport", "link": "https://news.example/hoax"},
        {"title": "Airport travel tips", "link": "https://travel.example/tips"},
    ]}
    cache = ResponseCache(tmp_path / "c.sqlite")
    cache.put(lens_url_params(URL), exact)
    cache.put(lens_url_params(URL, "visual_matches"), similar)
    client = SerpClient(mode="replay", db_path=tmp_path / "c.sqlite", fixtures_dir=tmp_path / "none")
    report, _ = check(client, image_url=URL)
    assert [(f.publisher, f.found_in) for f in report.fact_checks] == [("Factly", "copies"), ("news.example", "similar")]
    assert "Already fact-checked by Factly, and called out by 1 other outlet." in report.verdict.detail
    assert report.reply.en.startswith("ℹ️ About this photo:") and "Factly" in report.reply.hi


def test_news_must_match_the_claim_not_just_the_city():
    from firstseen.factcheck import relevant
    kw = "Ahmedabad airport flooded heavy rain"
    assert relevant("Ahmedabad airport flooded after heavy rain", kw)
    assert not relevant("Frequency of 90 flights from Ahmedabad to increase", kw)


def test_contexts_find_storms_places_and_scripts():
    from firstseen.contexts import contexts, script_of
    titles = [(2011, "Shark swims down Puerto Rico street after Hurricane Irene"),
              (2011, "Hurricane Irene: shark in Puerto Rico?"),
              (2017, "Shark on Houston highway during Hurricane Harvey"),
              (2017, "Hurricane Harvey: Houston shark photo is fake")]
    labels = [(c["label"], c["first_year"]) for c in contexts(titles)]
    assert ("Hurricane Irene", 2011) in labels and ("Puerto Rico", 2011) in labels
    assert ("Hurricane Harvey", 2017) in labels and ("Houston", 2017) in labels
    assert script_of("2015-ஆம் ஆண்டில் நம்மையெல்லாம்") == "Tamil"
    assert script_of("रौशनी से चमकते भारत की सैटेलाइट तस्वीर") == "Devanagari (Hindi, Marathi)"


def test_telegram_reply_has_verdict_evidence_and_both_languages(tmp_path):
    from firstseen.telegram_bot import format_reply
    client = client_with(tmp_path, lens_url_params(URL), VIRAL)
    report, _ = check(client, image_url=URL, claim="Shark on the road in today's floods")
    text = format_reply(report)
    assert text.startswith("<b>Online since at least Jul 2011, not new</b>")
    assert "Forward this:" in text and "हिंदी में:" in text and "यह तस्वीर नई नहीं है" in text


def test_hindi_claim_is_understood(tmp_path):
    from firstseen.factcheck import claim_keywords
    assert claim_keywords("आज अहमदाबाद एयरपोर्ट पानी में डूबा") == "अहमदाबाद एयरपोर्ट पानी डूबा"
    client = client_with(tmp_path, lens_url_params(URL), VIRAL)
    report, _ = check(client, image_url=URL, claim="अभी की तस्वीर: एयरपोर्ट पानी में डूबा")
    assert report.verdict.label == "older_than_claimed"


def test_telegram_picks_the_forwarded_media():
    from firstseen.telegram_bot import Bot
    photo = {"photo": [{"file_id": "small", "width": 90, "height": 90}, {"file_id": "big", "width": 1280, "height": 960}]}
    assert Bot.media_file_id(photo) == "big"
    assert Bot.media_file_id({"video": {"file_id": "v"}}) == "v"
    assert Bot.media_file_id({"document": {"file_id": "d", "mime_type": "video/mp4"}}) == "d"
    assert Bot.media_file_id({"document": {"file_id": "x", "mime_type": "application/pdf"}}) is None
    assert Bot.media_file_id({"text": "hello"}) is None
