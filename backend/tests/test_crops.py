# AI-assisted: Claude Code
"""Fertiliser guide in the crop table: only published, cited rates; unknowns stay explicit."""
import json
from pathlib import Path

PAGES = {  # each crop links to its own protocol page
    "black_gram": "http://myanmarseedportal.gov.mm/en/protocol/black-gram",
    "mung_bean": "http://myanmarseedportal.gov.mm/en/protocol/green-gram",
}
CROPS = json.loads((Path(__file__).resolve().parents[1] / "app" / "engine" / "crops.json").read_text(encoding="utf-8"))


def test_every_crop_has_a_fertiliser_entry():
    for cid, crop in CROPS["crops"].items():
        assert "fertiliser" in crop, cid


def test_published_rates_are_cited_and_positive():
    for cid, crop in CROPS["crops"].items():
        f = crop["fertiliser"]
        if not f["verified"]:
            continue
        assert f["source"] in CROPS["sources"], cid
        assert "http" in CROPS["sources"][f["source"]], "source must carry a link"
        assert f["value"]["products"], cid
        assert f["url"] == PAGES[cid], cid
        for p in f["value"]["products"]:
            assert p["amount"] > 0 and p["unit"] == "lb/acre", (cid, p)


def test_unchecked_rates_carry_no_numbers():
    # A rate we could not read in the original must not appear as a number.
    for cid, crop in CROPS["crops"].items():
        f = crop["fertiliser"]
        if f["verified"]:
            continue
        assert f["value"] is None, cid


def test_pulses_have_the_department_of_agriculture_rates():
    bg = {p["product"]: p["amount"] for p in CROPS["crops"]["black_gram"]["fertiliser"]["value"]["products"]}
    mb = {p["product"]: p["amount"] for p in CROPS["crops"]["mung_bean"]["fertiliser"]["value"]["products"]}
    assert bg == {"urea": 28, "tsp": 84, "potash": 56, "gypsum": 112}
    assert mb == {"urea": 28, "tsp": 84, "potash": 65, "gypsum": 112}
