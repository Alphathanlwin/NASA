# AI-assisted: Claude Code
"""Dump Python engine results for scripts/parity_test.mjs. Not part of the app."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.engine import engine  # noqa: E402


def main():
    snap = json.loads((ROOT / "frontend" / "public" / "snapshot.json").read_text(encoding="utf-8"))
    out = {}
    for fid, rec in snap["fields"].items():
        clim = snap["climatology"].get(rec["town_id"])
        inputs = engine.inputs_from_profile(rec, clim)
        out[fid] = {"base": engine.evaluate(inputs), "scenarios": {}}
        user = dict(rec, irrigation="sometimes", user_moisture="low", user_drainage="poor",
                    values={**rec["values"], "soil_ph": {**rec["values"]["soil_ph"], "value": 5.2}})
        out[fid]["readings"] = engine.evaluate(engine.inputs_from_profile(user, clim))
        for s in snap["scenario_definitions"]:
            out[fid]["scenarios"][s["id"]] = engine.evaluate(inputs, s["assumptions"])
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
