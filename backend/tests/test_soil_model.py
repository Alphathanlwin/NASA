# AI-assisted: Claude Code
"""Soil-moisture model: the parts that decide what the model learns from and how it is judged."""
import pandas as pd

from app.ml import soil_moisture as sm


def smap_rows(rows):
    """rows: (site, date, am, am_flag, pm, pm_flag)"""
    return pd.DataFrame(rows, columns=["ID", "Date", "am", "am_flag", "pm", "pm_flag"])


def test_only_recommended_in_range_readings_are_kept():
    raw = smap_rows([
        ("a", "2026-01-01", 0.30, 0, -9999, 0),   # good AM, fill PM
        ("a", "2026-01-02", 0.30, 1, 0.20, 1),    # both flagged not recommended
        ("a", "2026-01-03", 0.60, 0, 0.01, 0),    # both out of product range
        ("a", "2026-01-04", 0.20, 0, 0.40, 0),    # both good -> mean
    ])
    out = sm.clean_smap(raw)
    assert list(out["date"].dt.strftime("%Y-%m-%d")) == ["2026-01-01", "2026-01-04"]
    assert out["sm"].round(3).tolist() == [0.30, 0.30]


def test_rain_windows_sum_the_days_up_to_and_including_today():
    days = pd.date_range("2026-01-01", periods=10, freq="D")
    power = pd.DataFrame({"PRECTOTCORR": range(10), "T2M_MAX": 30.0, "T2M_MIN": 22.0, "RH2M": 80.0,
                          "ALLSKY_SFC_SW_DWN": 18.0, "WS2M": 2.0, "GWETTOP": 0.5, "GWETROOT": 0.6}, index=days)
    f = sm.features(power)
    last = f.iloc[-1]
    assert last["rain_1d"] == 9
    assert last["rain_3d"] == 7 + 8 + 9
    assert last["rain_7d"] == sum(range(3, 10))
    assert pd.isna(f.iloc[0]["rain_3d"])   # not enough history: unknown, not zero


def toy(n_sites=4, n=30):
    import numpy as np
    rng = np.random.default_rng(0)
    rows = []
    for s in range(n_sites):
        X = rng.normal(size=(n, len(sm.FEATURES)))
        y = 0.25 + 0.05 * X[:, sm.FEATURES.index("GWETTOP")] + rng.normal(0, 0.01, n)
        d = pd.DataFrame(X, columns=sm.FEATURES)
        d["sm"], d["site"] = y, f"s{s}"
        rows.append(d)
    return pd.concat(rows, ignore_index=True)


def test_every_algorithm_trains_and_predicts():
    df = toy()
    names = set(sm.candidates())
    assert {"baseline_mean", "baseline_power_wetness", "ridge", "lasso", "elastic_net", "knn", "svr",
            "random_forest", "extra_trees", "gradient_boosting", "boosted_trees", "gaussian_process",
            "neural_net"} <= names
    for name, (model, cols, grid) in sm.candidates().items():
        m, _ = sm.tune(model, grid, df[cols], df["sm"], df["site"])
        assert len(m.predict(df[cols])) == len(df), name


def test_algorithm_choice_never_sees_the_test_site():
    df = toy()
    seen = []
    result = sm.nested_selection(df, names=["ridge", "knn"], on_fold=lambda train_sites, test_site, pick: seen.append((train_sites, test_site)))
    assert result["n"] == len(df)
    for train_sites, test_site in seen:
        assert test_site not in train_sites


def test_site_holdout_never_trains_on_the_site_it_tests():
    df = pd.DataFrame({"site": ["a", "a", "b", "b", "c", "c"], "x": range(6), "sm": [0.1] * 6})
    for train, test in sm.site_folds(df):
        assert set(df.iloc[train]["site"]).isdisjoint(set(df.iloc[test]["site"]))
