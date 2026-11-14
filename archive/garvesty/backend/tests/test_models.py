"""Model gates test the experiment, rather than claiming agronomic accuracy."""
import json
import math
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from pipeline.evaluate_models import build_examples, evaluate_wetness, load_series
from app.services import models


def series(days=740):
    start = date(2022, 1, 1)
    return {(start + timedelta(days=i)).isoformat():
            0.5 + 0.2 * math.sin(2 * math.pi * i / 365.25) for i in range(days)}


class ModelEvaluationTests(unittest.TestCase):
    def test_calendar_targets_respect_availability_lag(self):
        samples = build_examples(series(70), "cell-a")
        first = samples[0]
        self.assertEqual(first["issue_date"], "2022-02-02")
        self.assertEqual(first["feature_end"], "2022-01-28")
        self.assertEqual(first["target_start"], "2022-02-03")
        self.assertEqual(first["target_end"], "2022-02-09")

    def test_missing_days_never_become_shorter_windows(self):
        values = series(70)
        del values["2022-01-20"]
        examples = build_examples(values, "cell-a")
        self.assertTrue(examples)
        self.assertGreaterEqual(examples[0]["feature_end"], "2022-02-17")

    def test_raw_loader_rejects_fill_invalid_values_and_duplicate_days(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "daily_a.json"
            path.write_text(json.dumps({"retrieved_utc": "2024-01-04T00:00:00Z", "response": {
                "header": {"fill_value": -999}, "properties": {"parameter": {"GWETROOT": {
                    "20240101": 0.3, "20240102": -999, "20240103": 1.2, "20240104": None,
                }}}}}), encoding="utf-8")
            result, sources = load_series(Path(tmp))
            self.assertEqual(result["a"], {"2024-01-01": 0.3})
            self.assertEqual(len(sources), 1)
            self.assertEqual(len(sources[0]["sha256"]), 64)

    def test_time_split_is_purged_and_cells_share_a_cutoff(self):
        result = evaluate_wetness({"a": series(), "b": series()})
        self.assertEqual(result["status"], "experimental")
        self.assertFalse(result["used_in_recommendations"])
        evaluation = result["evaluation"]
        self.assertLess(evaluation["train_last_target_available"], evaluation["test_first_issue"])
        self.assertEqual(evaluation["split"], "chronological, shared date cutoff across cells")
        self.assertEqual(set(result["metrics"]), {"ridge", "persistence", "seasonal"})
        self.assertTrue(all(math.isfinite(m["mae"]) for m in result["metrics"].values()))
        self.assertEqual(evaluate_wetness({"a": series(), "b": series()}), result)

    def test_short_history_blocks_training(self):
        result = evaluate_wetness({"a": series(90)})
        self.assertEqual(result["status"], "blocked")
        self.assertFalse(result["used_in_recommendations"])
        self.assertNotIn("metrics", result)

    def test_absent_or_bad_manifest_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "evaluation.json"
            with patch.object(models, "MANIFEST_PATH", path):
                result = models.get_model_status()
                self.assertEqual(len(result["tracks"]), 3)
                self.assertTrue(all(t["status"] == "blocked" for t in result["tracks"]))
                path.write_text("not-json", encoding="utf-8")
                self.assertTrue(all(not t["used_in_recommendations"] for t in models.get_model_status()["tracks"]))


if __name__ == "__main__":
    unittest.main()
