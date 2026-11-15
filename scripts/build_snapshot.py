# AI-assisted: Claude Code
"""Build the judge-accessible static snapshot.

    python scripts/build_snapshot.py

Reads the cleaned files in data/ and writes frontend/public/snapshot.json with:
  * the four field profiles and their provenance,
  * all three rotation plans at the default priorities,
  * every hero scenario (original vs scenario),
  * the deterministic agent log,
  * the source catalogue and cleaning report for Analyst Mode.

The frontend falls back to this file when the FastAPI backend is unreachable.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "scripts"))

from app.engine import agent, engine  # noqa: E402
from sync_crops import main as sync_crops  # noqa: E402

DATA = ROOT / "data"
OUT = ROOT / "frontend" / "public" / "snapshot.json"


def read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    sync_crops()
    snap = read(DATA / "snapshots" / "fields_snapshot.json")
    geo = read(DATA / "fields.geojson")
    sources = read(DATA / "sources.json")
    report = read(DATA / "reports" / "cleaning_report.json")
    base = geo.get("agent_base") or {"lat": 16.809, "lon": 96.157, "name": "Yangon advisory office (DEMO)"}
    climatology = snap.get("climatology") or {}

    fields = {}
    for fid, rec in (snap.get("fields") or {}).items():
        clim = climatology.get(rec["town_id"])
        inputs = engine.inputs_from_profile(rec, clim)
        profile = dict(rec)
        profile["nearest_reference"] = (f"Nearest reference: {rec['town_name']}, {rec['town_distance_km']} km. "
                                        "Grid-cell value, not a field measurement.")
        profile["plans"] = engine.evaluate(inputs)
        scenarios = []
        for s in engine.TABLE.get("scenarios", []):
            cmp = engine.compare(inputs, s["assumptions"])
            scenarios.append({
                "id": s["id"], "group": s["group"], "label": s["label"], "assumptions": s["assumptions"],
                "changed_assumptions": cmp["changed_assumptions"], "plans": cmp["plans"],
                "scenario": cmp["scenario_result"]["scenario"], "weights": cmp["scenario_result"]["weights"],
            })
        profile["scenarios"] = scenarios
        profile["agent_run"] = agent.build_run(rec, base)
        fields[fid] = profile

    payload = {
        "generated_at": snap.get("generated_at"),
        "retrieved_at": snap.get("retrieved_at"),
        "engine_version": engine.ENGINE_VERSION,
        "mode": "CACHED — offline mode",
        "geojson": geo,
        "fields": fields,
        "climatology": climatology,
        # IMERG monthly rain normals (2001-2025), kept with the snapshot for reference; POWER rain is too low in the west Delta
        "rain_climatology_imerg": (read(DATA / "clean" / "imerg_monthly_climatology.json")
                                   if (DATA / "clean" / "imerg_monthly_climatology.json").exists() else None),
        "towns": [{k: t[k] for k in ("id", "name", "lat", "lon")} for t in read(DATA / "reference" / "towns.json")["towns"]],
        "sources": sources.get("sources", []),
        "sources_retrieved_at": sources.get("retrieved_at"),
        "cleaning_report": report,
        "scenario_definitions": engine.TABLE.get("scenarios", []),
        "defaults": {"priorities": {"income": 40, "soil_health": 30, "water_saving": 30}, "econ": {}},
        "disclaimer": "Decision support only — not a yield forecast or agronomic prescription. Check with local extension officers.",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(fields)} fields, {len(payload['sources'])} sources")

    # NASA MODIS land cover for the "can't be planted here" check; loaded by the app only when needed
    land = DATA / "clean" / "landcover.json"
    if land.exists():
        lc = read(land)
        out = OUT.parent / "landcover.json"
        out.write_text(json.dumps({"year": lc["year"], "source": lc["source"], "tiles": lc["tiles"]},
                                  separators=(",", ":")), encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)}: {len(lc['tiles'])} tiles, year {lc['year']}")

    # OpenStreetMap houses and village areas near the reference towns, for the same check
    bld = DATA / "clean" / "buildings.json"
    if bld.exists():
        b = read(bld)
        # houses snapped to ~20 m squares (one per occupied square), stored as sorted index deltas
        g = 0.0002
        cells = {(round(la / g), round(lo / g)) for la, lo in b["buildings"]}
        la0, lo0 = min(c[0] for c in cells), min(c[1] for c in cells)
        width = max(c[1] for c in cells) - lo0 + 1
        idx = sorted((c[0] - la0) * width + (c[1] - lo0) for c in cells)
        deltas = [idx[0]] + [idx[i] - idx[i - 1] for i in range(1, len(idx))]

        def simplify(v):
            out_pts = []
            for la, lo in v:
                p = [round(la, 4), round(lo, 4)]
                if not out_pts or out_pts[-1] != p:
                    out_pts.append(p)
            return out_pts
        villages = [s for s in (simplify(v) for v in b["villages"]) if len(s) >= 3]
        out = OUT.parent / "buildings.json"
        out.write_text(json.dumps({"source": b["source"], "retrieved_at": b["retrieved_at"], "boxes": b["boxes"],
                                   "grid": g, "origin": [la0, lo0], "width": width, "cells_delta": deltas,
                                   "villages": villages}, separators=(",", ":")), encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)}: {len(b['buildings'])} buildings in {len(cells)} squares, {len(villages)} village areas")


if __name__ == "__main__":
    main()
