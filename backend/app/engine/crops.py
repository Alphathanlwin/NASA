"""Crop table for the Myanmar Delta and Central Dry Zone.

Seasons, durations, families and water classes come from the project design doc
(section 8.1; sources: Myanmar Pulses Sector Development Strategy 2017, ACIAR/IRRI
guides). pH / temperature / rainfall tolerances are loaded from FAO EcoCrop
(data/reference/ecocrop_ranges.json). Sowing windows for a specific township
still need local confirmation, and the UI says so.
"""
import json
from dataclasses import dataclass
from pathlib import Path

REFERENCE = Path(__file__).resolve().parents[3] / "data" / "reference" / "ecocrop_ranges.json"

# The year is planned as two slots.
SLOTS = {
    "dry": {"label": "Dry season (Nov-Apr)", "days": 181},
    "monsoon": {"label": "Monsoon (May-Oct)", "days": 184},
}

# Ordinal water-saving points per water class. Only the pulse figure has a published
# anchor (pulses use roughly 20% of paddy water); the rest is an ordering, not a measurement.
WATER_POINTS = {"very_high": 0, "medium": 50, "low_medium": 65, "low": 80, "none": 100}


# Relative bought-input cost tier per crop: "none" (no bought input), "low"
# (legumes fix their own nitrogen; sesame needs little), "medium", "high"
# (rice needs bought nitrogen, pesticide and water management). This is a
# team ordering of input dependence, not market data — no price is implied.
# The scenario rule uses it when the farmer reports cash is tight.
@dataclass(frozen=True)
class Crop:
    id: str
    name: str
    family: str
    slots: tuple[str, ...]
    duration_days: tuple[int, int]
    water_class: str
    legume: bool = False
    flooded: bool = False
    needs_irrigation_in_dry: bool = False
    ecocrop_key: str | None = None
    local_check: str | None = None
    input_cost: str = "medium"


CROPS: dict[str, Crop] = {c.id: c for c in [
    Crop("monsoon_rice", "Monsoon rice", "Poaceae (grass)", ("monsoon",), (90, 150), "very_high",
         flooded=True, ecocrop_key="rice", input_cost="high"),
    Crop("summer_rice", "Summer rice", "Poaceae (grass)", ("dry",), (90, 150), "very_high",
         flooded=True, needs_irrigation_in_dry=True, ecocrop_key="rice",
         local_check="Needs reliable irrigation water through April.", input_cost="high"),
    Crop("black_gram", "Black gram (matpe)", "Fabaceae (legume)", ("dry",), (90, 120), "low",
         legume=True, ecocrop_key="black_gram",
         local_check="Sow soon after rice harvest while the soil is still moist.", input_cost="low"),
    Crop("green_gram", "Green gram (mung bean)", "Fabaceae (legume)", ("dry", "monsoon"), (75, 90), "low",
         legume=True, ecocrop_key="green_gram", input_cost="low"),
    Crop("chickpea", "Chickpea", "Fabaceae (legume)", ("dry",), (90, 120), "low",
         legume=True, ecocrop_key="chickpea",
         local_check="Mainly a Central Dry Zone crop; ask whether it is grown near you.", input_cost="low"),
    Crop("pigeon_pea", "Pigeon pea", "Fabaceae (legume)", ("monsoon",), (200, 200), "low_medium",
         legume=True, ecocrop_key="pigeon_pea", input_cost="low"),
    Crop("sesame", "Sesame", "Pedaliaceae", ("dry", "monsoon"), (80, 100), "low",
         ecocrop_key="sesame", local_check="Does not tolerate standing water.", input_cost="low"),
    Crop("groundnut", "Groundnut", "Fabaceae (legume)", ("dry", "monsoon"), (100, 120), "medium",
         legume=True, ecocrop_key="groundnut", local_check="Prefers lighter, well-drained soil.", input_cost="low"),
    Crop("maize", "Maize", "Poaceae (grass)", ("dry", "monsoon"), (90, 120), "medium",
         ecocrop_key="maize", local_check="Needs drainage; does not tolerate waterlogging.", input_cost="medium"),
    Crop("fallow", "Fallow / green manure", "none", ("dry", "monsoon"), (0, 0), "none", input_cost="none"),
]}


def load_ranges() -> dict:
    if not REFERENCE.exists():
        return {}
    return json.loads(REFERENCE.read_text(encoding="utf-8")).get("crops", {})


RANGES = load_ranges()


def ranges_for(crop: Crop) -> dict | None:
    return RANGES.get(crop.ecocrop_key) if crop.ecocrop_key else None
