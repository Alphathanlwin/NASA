"""The rotation rules. Each rule is one pure function that returns findings:
a number of points on one score component plus the sentence the farmer sees.
No I/O, no randomness, no model.

Point sizes and the wetness thresholds are rule weights chosen by the team, not
measurements. Tolerance ranges come from FAO EcoCrop.
"""
from dataclasses import dataclass

from .crops import SLOTS, WATER_POINTS, Crop, ranges_for


@dataclass(frozen=True)
class Finding:
    rule: str
    component: str  # "soil" | "water" | "adjustment"
    points: float
    text: str


@dataclass(frozen=True)
class Context:
    """Everything the rules know about one field."""
    prev_crop: Crop | None          # crop just harvested (the usual monsoon crop)
    irrigated: bool | None
    ph: float | None
    gwetroot: float | None          # POWER root-zone wetness, 0-1
    monsoon_rain_mm: float | None
    dry_rain_mm: float | None
    temps: dict                     # {"monsoon": {"t2m":..,"t2m_max":..}, "winter": {...}, "summer": {...}}
    drainage: str = "unknown"


def same_crop(a: Crop, b: Crop) -> bool:
    return a.id == b.id or (a.ecocrop_key is not None and a.ecocrop_key == b.ecocrop_key)


# Rule 1 -------------------------------------------------------------- season fit
def rule_season_fit(crop: Crop, slot: str) -> str | None:
    """Returns a rejection reason, or None when the crop fits the slot."""
    if slot not in crop.slots:
        return f"{crop.name} is not grown in the {SLOTS[slot]['label'].lower()}."
    if crop.duration_days[0] > SLOTS[slot]["days"]:
        return (f"{crop.name} needs about {crop.duration_days[0]} days; "
                f"the {SLOTS[slot]['label'].lower()} window is {SLOTS[slot]['days']} days.")
    return None


# Rule 5 (hard part) --------------------------------------------- irrigation need
def rule_irrigation_required(crop: Crop, slot: str, ctx: Context) -> str | None:
    if slot == "dry" and crop.needs_irrigation_in_dry and ctx.irrigated is False:
        return f"{crop.name} needs irrigation through the dry season; this field is marked rain-fed."
    return None


# Rule 2 ----------------------------------------------------- legume nitrogen credit
def rule_legume_credit(dry: Crop, monsoon: Crop, ctx: Context) -> list[Finding]:
    out = []
    if dry.legume:
        out.append(Finding("Legume nitrogen credit", "soil", 15,
                           f"{dry.name} is a legume and may contribute nitrogen when residues and nodulation are managed. "
                           "This qualitative team-rule credit requires local review; no nutrient quantity is predicted."))
    if monsoon.legume:
        out.append(Finding("Legume nitrogen credit", "soil", 10,
                           f"{monsoon.name} may contribute nitrogen with suitable management; this is a team-rule assumption."))
    return out


# Rule 3 ------------------------------------------------------- paddy-pulse cycle
def rule_paddy_cycle(dry: Crop, monsoon: Crop, ctx: Context) -> list[Finding]:
    prev = ctx.prev_crop
    out = []
    if dry.flooded and ((prev and prev.flooded) or monsoon.flooded):
        out.append(Finding("Paddy cycle", "soil", -25,
                           "Flooded rice in back-to-back seasons with no legume or fallow between: "
                           "may increase pest carry-over under some management systems. This penalty is a team assumption."))
    if prev and prev.flooded and dry.id in ("black_gram", "green_gram"):
        out.append(Finding("Paddy cycle", "soil", 8,
                           f"Rice then {dry.name.lower()} is a documented Delta rotation option. "
                           "The score credit is a team assumption, not a measured advantage."))
    if dry.id == "fallow" and prev and prev.flooded and monsoon.flooded:
        out.append(Finding("Paddy cycle", "soil", 6, "A fallow season between two rice crops rests the soil."))
    return out


# Rule 4 --------------------------------------------------------------- pest break
def rule_pest_break(dry: Crop, monsoon: Crop, ctx: Context) -> list[Finding]:
    out = []
    pairs = []
    if ctx.prev_crop:
        pairs.append((ctx.prev_crop, dry))
    pairs.append((dry, monsoon))
    for before, after in pairs:
        if "fallow" in (before.id, after.id):
            out.append(Finding("Pest break", "soil", 6,
                               f"{before.name} to {after.name.lower()}: a bare or green-manure season interrupts pest cycles."))
        elif same_crop(before, after):
            out.append(Finding("Pest break", "soil", -20,
                               f"{before.name} to {after.name.lower()}: repeated hosts may increase carry-over of some pests; verify locally."))
        elif before.family == after.family:
            out.append(Finding("Pest break", "soil", -12,
                               f"{before.name} to {after.name.lower()}: same family ({before.family}), weak pest break."))
        else:
            out.append(Finding("Pest break", "soil", 8,
                               f"{before.name} to {after.name.lower()}: different families may interrupt host-specific pests; not all pests are controlled."))
    return out


# Rule 6 ---------------------------------------------------------------- soil fit
def rule_soil_fit(dry: Crop, monsoon: Crop, ctx: Context) -> list[Finding]:
    out = []
    if ctx.ph is None:
        return out
    for crop in (dry, monsoon):
        rng = ranges_for(crop)
        if not rng or rng.get("ph_abs_min") is None:
            continue
        lo, hi, olo, ohi = rng["ph_abs_min"], rng["ph_abs_max"], rng["ph_opt_min"], rng["ph_opt_max"]
        if olo <= ctx.ph <= ohi:
            out.append(Finding("Soil fit", "soil", 5,
                               f"Soil pH {ctx.ph} is inside {crop.name.lower()}'s optimum {olo}-{ohi} (EcoCrop)."))
        elif lo <= ctx.ph <= hi:
            out.append(Finding("Soil fit", "soil", -5,
                               f"Soil pH {ctx.ph} is outside {crop.name.lower()}'s optimum {olo}-{ohi} "
                               f"but inside its tolerated {lo}-{hi} (EcoCrop)."))
        else:
            out.append(Finding("Soil fit", "soil", -15,
                               f"Soil pH {ctx.ph} is outside {crop.name.lower()}'s tolerated range {lo}-{hi} (EcoCrop)."))
    return out


# Rule 8 --------------------------------------------------------------- diversity
def rule_diversity(dry: Crop, monsoon: Crop, ctx: Context) -> list[Finding]:
    crops = [c for c in (ctx.prev_crop, dry, monsoon) if c and c.id != "fallow"]
    families = {c.family for c in crops}
    if len(families) >= 3:
        return [Finding("Diversity", "soil", 8, "Three crop families across the cycle: more resilient to a single pest or bad season.")]
    if len(families) == 1 and len(crops) >= 2:
        return [Finding("Diversity", "soil", -5, f"Only one crop family ({next(iter(families))}) across the cycle.")]
    return []


# Rule 5 (scored part) -------------------------------------------------- water budget
def water_base(dry: Crop, monsoon: Crop) -> float:
    """Water saving is scored on the dry season, when water is scarce.
    Monsoon crops are rain-fed; the monsoon only adds penalties for too much rain."""
    return float(WATER_POINTS[dry.water_class])


def rule_water_budget(dry: Crop, monsoon: Crop, ctx: Context) -> list[Finding]:
    out = []
    if dry.water_class == "low" and dry.legume:
        out.append(Finding("Water budget", "water", 0,
                           f"{dry.name}: lower dry-season water demand category in the team's crop table; no water-volume saving is predicted."))
    elif dry.water_class == "very_high":
        out.append(Finding("Water budget", "water", 0,
                           f"{dry.name}: very high water need in the season when water is scarce."))
    elif dry.id == "fallow":
        out.append(Finding("Water budget", "water", 0, "A dry-season fallow uses no irrigation water, and earns nothing."))

    # Dry season: is there moisture to start a rain-fed crop?
    if dry.id != "fallow" and ctx.irrigated is False and ctx.gwetroot is not None:
        if ctx.gwetroot >= 0.7:
            out.append(Finding("Water budget", "water", 8,
                               f"Root-zone wetness is {ctx.gwetroot} (NASA POWER, modelled, 0-1 scale): "
                               f"a relatively wet regional reference under the team's 0.7 threshold. "
                               f"Check field moisture before establishing {dry.name.lower()}."))
        elif ctx.gwetroot < 0.5:
            out.append(Finding("Water budget", "water", -12,
                               f"Root-zone wetness is only {ctx.gwetroot} (NASA POWER, modelled, 0-1 scale): "
                               f"below the team's 0.5 threshold. Check field moisture; this is not a crop-failure prediction."))
    if dry.id != "fallow" and ctx.irrigated and dry.water_class == "very_high":
        out.append(Finding("Water budget", "water", -6,
                           f"{dry.name} draws irrigation water for the whole dry season."))

    # Monsoon: too much rain for crops that are not flooded?
    rng = ranges_for(monsoon)
    if rng and ctx.monsoon_rain_mm is not None and monsoon.id != "fallow":
        if rng.get("rain_abs_max_mm") and ctx.monsoon_rain_mm > rng["rain_abs_max_mm"]:
            out.append(Finding("Water budget", "water", -15,
                               f"Monsoon rain averages {ctx.monsoon_rain_mm:.0f} mm (POWER climatology), above "
                               f"{monsoon.name.lower()}'s tolerated maximum {rng['rain_abs_max_mm']:.0f} mm (EcoCrop)."))
        elif not monsoon.flooded and rng.get("rain_opt_max_mm") and ctx.monsoon_rain_mm > rng["rain_opt_max_mm"]:
            out.append(Finding("Water budget", "water", -8,
                               f"Monsoon rain averages {ctx.monsoon_rain_mm:.0f} mm (POWER climatology), above "
                               f"{monsoon.name.lower()}'s optimum maximum {rng['rain_opt_max_mm']:.0f} mm (EcoCrop): "
                               "waterlogging risk unless the field drains."))
    return out


# Climate fit ---------------------------------------------------------- temperature
def season_temps(crop: Crop, slot: str, ctx: Context) -> tuple[float | None, float | None]:
    """Mean and mean-daily-maximum temperature the crop meets in its slot."""
    if slot == "monsoon":
        t = ctx.temps.get("monsoon") or {}
        return t.get("t2m"), t.get("t2m_max")
    winter, summer = ctx.temps.get("winter") or {}, ctx.temps.get("summer") or {}
    if crop.duration_days[1] <= 120:  # sown in November, out before the hot months
        return winter.get("t2m"), winter.get("t2m_max")
    means = [(winter.get("t2m"), 4), (summer.get("t2m"), 2)]
    if any(m is None for m, _ in means):
        return None, None
    mean = sum(m * w for m, w in means) / 6
    maxes = [v for v in (winter.get("t2m_max"), summer.get("t2m_max")) if v is not None]
    return round(mean, 1), max(maxes) if maxes else None


def rule_temperature(dry: Crop, monsoon: Crop, ctx: Context) -> list[Finding]:
    out = []
    for crop, slot in ((dry, "dry"), (monsoon, "monsoon")):
        rng = ranges_for(crop)
        if not rng or crop.id == "fallow":
            continue
        mean, tmax = season_temps(crop, slot, ctx)
        if tmax is not None and rng.get("temp_abs_max_c") and tmax > rng["temp_abs_max_c"]:
            out.append(Finding("Temperature fit", "adjustment", -10,
                               f"Daily maximum averaged {tmax} C in this season over the last two years (POWER daily), above "
                               f"{crop.name.lower()}'s tolerated {rng['temp_abs_max_c']:.0f} C (EcoCrop): heat-stress risk."))
        elif mean is not None and rng.get("temp_opt_min_c") is not None:
            if rng["temp_opt_min_c"] <= mean <= rng["temp_opt_max_c"]:
                out.append(Finding("Temperature fit", "adjustment", 2,
                                   f"Season mean {mean} C is inside {crop.name.lower()}'s optimum "
                                   f"{rng['temp_opt_min_c']:.0f}-{rng['temp_opt_max_c']:.0f} C (EcoCrop)."))
            else:
                out.append(Finding("Temperature fit", "adjustment", -4,
                                   f"Season mean {mean} C is outside {crop.name.lower()}'s optimum "
                                   f"{rng['temp_opt_min_c']:.0f}-{rng['temp_opt_max_c']:.0f} C (EcoCrop)."))
    return out


# Field drainage ------------------------------------------------------------------
def rule_paddy_drainage(dry: Crop, monsoon: Crop, ctx: Context) -> list[Finding]:
    """Drainage comes from the user, never from an inferred crop-history condition."""
    if ctx.drainage != "poor":
        return []
    return [Finding("Field drainage", "adjustment", -12,
                    f"Drainage is marked poor by the user. {crop.name} may face waterlogging; "
                    "the 12-point penalty is a team assumption requiring local review.")
            for crop in (dry, monsoon) if not crop.flooded and crop.id != "fallow"]


SCORED_RULES = [rule_legume_credit, rule_paddy_cycle, rule_pest_break, rule_soil_fit,
                rule_diversity, rule_water_budget, rule_temperature, rule_paddy_drainage]
