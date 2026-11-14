import hashlib
import json
import math
from datetime import date, datetime, timedelta
from pathlib import Path
import numpy as np


def build_examples(series_dict: dict[str, float], cell_id: str = "cell") -> list[dict]:
    """Build feature/target pairs respecting calendar availability lag.
    
    Feature window: 28 consecutive days
    Availability lag: 5 days between feature_end and issue_date
    Target window: 7 consecutive days starting issue_date + 1 day
    """
    sorted_dates = sorted(datetime.strptime(d, "%Y-%m-%d").date() for d in series_dict.keys())
    if not sorted_dates:
        return []

    min_date = sorted_dates[0]
    max_date = sorted_dates[-1]

    examples = []
    # Loop over candidate issue dates
    # earliest issue_date has 28 days of feature (min_date + 27 days = feature_end)
    # plus 5 days lag: issue_date = min_date + 32 days
    cur_issue = min_date + timedelta(days=32)
    while cur_issue + timedelta(days=7) <= max_date:
        feature_end = cur_issue - timedelta(days=5)
        feature_start = feature_end - timedelta(days=27)  # 28 days inclusive
        target_start = cur_issue + timedelta(days=1)
        target_end = cur_issue + timedelta(days=7)  # 7 days inclusive

        # Check all 28 feature days exist
        f_days = [(feature_start + timedelta(days=i)).isoformat() for i in range(28)]
        if not all(d in series_dict for d in f_days):
            cur_issue += timedelta(days=1)
            continue

        # Check all 7 target days exist
        t_days = [(target_start + timedelta(days=i)).isoformat() for i in range(7)]
        if not all(d in series_dict for d in t_days):
            cur_issue += timedelta(days=1)
            continue

        f_vals = [series_dict[d] for d in f_days]
        t_vals = [series_dict[d] for d in t_days]

        examples.append({
            "cell_id": cell_id,
            "issue_date": cur_issue.isoformat(),
            "feature_start": feature_start.isoformat(),
            "feature_end": feature_end.isoformat(),
            "target_start": target_start.isoformat(),
            "target_end": target_end.isoformat(),
            "features": f_vals,
            "target": float(np.mean(t_vals)),
            "last_observed": f_vals[-1],
            "day_of_year": cur_issue.timetuple().tm_yday,
            "month": cur_issue.month,
        })
        cur_issue += timedelta(days=1)

    return examples


def load_series(folder: Path) -> tuple[dict[str, dict[str, float]], list[dict]]:
    """Load and validate raw daily NASA POWER json files."""
    result = {}
    sources = []
    for path in sorted(folder.glob("*.json")):
        content_bytes = path.read_bytes()
        sha256 = hashlib.sha256(content_bytes).hexdigest()
        try:
            raw = json.loads(content_bytes.decode("utf-8"))
        except Exception:
            continue

        retrieved_utc = raw.get("retrieved_utc")
        stem = path.stem.replace("daily_", "")

        header = (raw.get("response") or raw).get("header") or {}
        fill_value = header.get("fill_value", -999)
        props = (raw.get("response") or raw).get("properties") or {}
        params = props.get("parameter") or {}
        gwet = params.get("GWETROOT") or {}

        cell_data = {}
        for d_str, val in gwet.items():
            if val is None or val == fill_value:
                continue
            try:
                v = float(val)
                if not (0.0 <= v <= 1.0):
                    continue
                # format date
                if len(d_str) == 8:
                    iso_d = f"{d_str[:4]}-{d_str[4:6]}-{d_str[6:8]}"
                else:
                    iso_d = d_str
                cell_data[iso_d] = v
            except (ValueError, TypeError):
                continue

        result[stem] = cell_data
        sources.append({
            "path": str(path),
            "sha256": sha256,
            "retrieved_utc": retrieved_utc,
            "observations": len(cell_data),
        })

    return result, sources


def evaluate_wetness(cell_series: dict[str, dict[str, float]]) -> dict:
    """Evaluate root-zone wetness ML track with strict chronological holdout."""
    all_examples = []
    for cid, s_dict in cell_series.items():
        all_examples.extend(build_examples(s_dict, cid))

    # Guard: short history blocks training
    max_days = max((len(s) for s in cell_series.values()), default=0)
    if max_days < 365 or len(all_examples) < 100:
        return {
            "status": "blocked",
            "used_in_recommendations": False,
            "reason": "Insufficient historical observations for chronological holdout",
        }

    # Chronological split with purge gap
    all_dates = sorted(set(e["issue_date"] for e in all_examples))
    split_idx = int(len(all_dates) * 0.7)
    split_date = all_dates[split_idx]

    # Purge: train samples must finish targets before test issues begin
    train = [e for e in all_examples if e["target_end"] < split_date]
    test = [e for e in all_examples if e["issue_date"] >= split_date]

    if not train or not test:
        return {
            "status": "blocked",
            "used_in_recommendations": False,
            "reason": "Split resulted in empty train or test partition",
        }

    train_last_target = max(e["target_end"] for e in train)
    test_first_issue = min(e["issue_date"] for e in test)

    # 1. Persistence baseline
    y_test = np.array([e["target"] for e in test])
    y_pred_pers = np.array([e["last_observed"] for e in test])
    mae_pers = float(np.mean(np.abs(y_test - y_pred_pers)))
    rmse_pers = float(np.sqrt(np.mean((y_test - y_pred_pers) ** 2)))

    # 2. Seasonal baseline (mean by month in train set)
    monthly_means = {}
    for m in range(1, 13):
        m_vals = [e["target"] for e in train if e["month"] == m]
        monthly_means[m] = float(np.mean(m_vals)) if m_vals else float(np.mean([e["target"] for e in train]))
    y_pred_seas = np.array([monthly_means[e["month"]] for e in test])
    mae_seas = float(np.mean(np.abs(y_test - y_pred_seas)))
    rmse_seas = float(np.sqrt(np.mean((y_test - y_pred_seas) ** 2)))

    # 3. Ridge regression baseline
    X_train = np.array([e["features"] for e in train])
    y_train = np.array([e["target"] for e in train])
    X_test = np.array([e["features"] for e in test])

    # Standardize and add bias
    mean_X = np.mean(X_train, axis=0)
    std_X = np.std(X_train, axis=0) + 1e-6
    X_tr_s = (X_train - mean_X) / std_X
    X_te_s = (X_test - mean_X) / std_X

    # Closed-form ridge regression
    n_feats = X_tr_s.shape[1]
    X_tr_bias = np.hstack([np.ones((len(X_tr_s), 1)), X_tr_s])
    X_te_bias = np.hstack([np.ones((len(X_te_s), 1)), X_te_s])
    reg = 10.0 * np.eye(n_feats + 1)
    reg[0, 0] = 0.0  # don't penalize intercept
    w = np.linalg.solve(X_tr_bias.T @ X_tr_bias + reg, X_tr_bias.T @ y_train)

    y_pred_ridge = X_te_bias @ w
    mae_ridge = float(np.mean(np.abs(y_test - y_pred_ridge)))
    rmse_ridge = float(np.sqrt(np.mean((y_test - y_pred_ridge) ** 2)))

    return {
        "status": "experimental",
        "used_in_recommendations": False,
        "metrics": {
            "ridge": {"mae": round(mae_ridge, 4), "rmse": round(rmse_ridge, 4)},
            "persistence": {"mae": round(mae_pers, 4), "rmse": round(rmse_pers, 4)},
            "seasonal": {"mae": round(mae_seas, 4), "rmse": round(rmse_seas, 4)},
        },
        "evaluation": {
            "split": "chronological, shared date cutoff across cells",
            "train_samples": len(train),
            "test_samples": len(test),
            "train_last_target_available": train_last_target,
            "test_first_issue": test_first_issue,
        },
    }
