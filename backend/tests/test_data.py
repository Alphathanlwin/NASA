import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier

import pytest

from app.services import power

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
import clean_all


def payload():
    dates = [f"202601{i:02d}" for i in range(1, 16)]
    params = {name: {d: 1.0 for d in dates} for name in power.PARAMS.split(",")}
    params["T2M"] = {d: 25.0 for d in dates}
    return {"header": {"fill_value": -777, "time_standard": "LST", "sources": ["MERRA2"]},
            "parameters": {"PRECTOTCORR": {"units": "mm/day"}},
            "properties": {"parameter": params}}


def test_calendar_windows_require_complete_rain_and_exact_wetness_day():
    body = payload()
    for values in body["properties"]["parameter"].values():
        values.pop("20260108")
    body["properties"]["parameter"]["PRECTOTCORR"]["20260110"] = -777
    result = power._summarise(body)
    assert result["weather"]["rain_7d"] is None
    assert result["weather"]["coverage"]["rain_7d"] == {"observed": 6, "expected": 7}
    assert result["wetness"]["gwetroot_7d_change"] is None
    assert result["weather"]["rain_30d"] is None


def test_live_rejects_nonfinite_and_out_of_range():
    body = payload()
    body["properties"]["parameter"]["RH2M"]["20260115"] = float("inf")
    body["properties"]["parameter"]["GWETROOT"]["20260115"] = 4
    result = power._summarise(body)
    assert result["weather"]["rh2m"] is None
    assert result["wetness"]["as_of"] == "2026-01-14"
    json.dumps(result, allow_nan=False)


def test_snapshot_and_live_share_normalization(tmp_path, monkeypatch):
    body = payload()
    body["properties"]["parameter"]["PRECTOTCORR"]["20260110"] = -777
    raw = tmp_path / "raw" / "power"
    raw.mkdir(parents=True)
    (raw / "daily_test.json").write_text(json.dumps({"response": body, "retrieved_utc": "2026-01-16T00:00:00Z"}))
    monkeypatch.setattr(clean_all, "RAW", tmp_path / "raw")
    monkeypatch.setattr(clean_all, "CLEAN", tmp_path / "clean")
    report = {"sources": {}}
    daily, meta = clean_all.clean_power_daily(report)
    assert daily.iloc[-1]["rain_7d"] != daily.iloc[-1]["rain_7d"]
    assert meta["test"]["time_standard"] == "LST"
    assert len(meta["test"]["raw_sha256"]) == 64
    assert meta["test"]["summary"]["weather"] == power._summarise(body)["weather"]


def test_smap_filters_quality_before_am_pm_average(tmp_path, monkeypatch):
    folder = tmp_path / "appeears"
    folder.mkdir()
    (folder / "SPL3SMP_E_results.csv").write_text(
        "ID,Date,soil_moisture,retrieval_qual_flag,soil_moisture_pm,retrieval_qual_flag_pm\n"
        "F-01,2026-01-01,0.2,0,0.5,1\nF-01,2026-01-02,0.3,8,0.5,2\n")
    monkeypatch.setattr(clean_all, "RAW", tmp_path)
    monkeypatch.setattr(clean_all, "CLEAN", tmp_path / "clean")
    _, smap, _ = clean_all.clean_appeears({"sources": {}})
    assert [row["sm"] for row in smap["F-01"]] == [0.2, 0.3]


def test_modis_requires_qa_and_finite_values(tmp_path, monkeypatch):
    folder = tmp_path / "appeears"
    folder.mkdir()
    (folder / "MOD13Q1_results.csv").write_text(
        "ID,Date,_250m_16_days_NDVI\nF-01,2026-01-01,0.4\n")
    monkeypatch.setattr(clean_all, "RAW", tmp_path)
    monkeypatch.setattr(clean_all, "CLEAN", tmp_path / "clean")
    report = {"sources": {}}
    ndvi, _, _ = clean_all.clean_appeears(report)
    assert ndvi == {}
    assert report["sources"]["modis_mod13q1"]["status"] == "INVALID"


def test_different_cells_refresh_concurrently(monkeypatch):
    barrier = Barrier(2)
    monkeypatch.delenv("FIELDSHIFT_OFFLINE", raising=False)
    def fetch(cell, lat, lon):
        barrier.wait(timeout=2)
        return {"cell": cell}
    monkeypatch.setattr(power, "_fetch_locked", fetch)
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(power.fetch_recent, cell, 1, 2) for cell in ("a", "b")]
        assert [f.result()["cell"] for f in futures] == ["a", "b"]
