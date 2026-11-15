# AI-assisted: Claude Code
"""Topsoil moisture model: learns NASA SMAP soil moisture from NASA POWER daily weather.

What it is for: SMAP misses days, and for some cells (Twante) it has had no recommended-quality
reading for months. This model gives a labelled *model estimate* for those gaps.
What it is not: a field measurement, a forecast, or a fertiliser or yield model.

Training data: SMAP L3 enhanced (SPL3SMP_E v006, 9 km) at 13 Delta points (6 demo fields +
7 Paw San townships, from AppEEARS), quality flag 'recommended' only. Inputs: NASA POWER daily
point data at each site (rain windows, temperature, humidity, sunlight, wind, POWER soil wetness).

Judged honestly: leave-one-site-out (the model never sees the site it is scored on) and a
later-months holdout, against two baselines (training mean; POWER soil wetness rescaled).
The estimate is only published if the model beats both baselines on unseen sites.

    python -m app.ml.soil_moisture            (from backend/)
"""
from __future__ import annotations

import json
import time
from datetime import date, datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data"
SMAP_FILES = [
    ROOT / "data/raw/appeears/ml_training/fieldshift-demo-fields-SPL3SMP-E-006-results.csv",
    ROOT / "data/raw/appeears/ml_training/pawsan-ayeyarwady-SPL3SMP-E-006-results.csv",
]
HISTORY_DIR = DATA / "raw" / "appeears" / "ml_history"   # full 2015- history (fetch_smap_history.py)
POWER_DIR = DATA / "raw" / "power" / "ml"
CLEAN = DATA / "models" / "smap_training_table.parquet"
MAX_ROWS = {"gaussian_process": 1500, "svr": 6000, "knn": 20000}  # slow algorithms train on a sample
OUT = DATA / "models" / "soil_moisture_model.json"
PARAMS = ["PRECTOTCORR", "T2M_MAX", "T2M_MIN", "RH2M", "ALLSKY_SFC_SW_DWN", "WS2M", "GWETTOP", "GWETROOT"]
RAIN_WINDOWS = [1, 3, 7, 14, 30]
SM_RANGE = (0.02, 0.5)  # SPL3SMP_E valid soil moisture range
SEED = 7


# ---------- data ----------

def clean_smap(raw: pd.DataFrame) -> pd.DataFrame:
    """Keep AM/PM retrievals whose flag says 'recommended' (bit 0 clear) and that sit inside the
    product range; average AM and PM for the day. Columns in: ID, Date, am, am_flag, pm, pm_flag."""
    parts = []
    for v, flag in (("am", "am_flag"), ("pm", "pm_flag")):
        ok = ((raw[flag].astype(int) & 1) == 0) & raw[v].between(*SM_RANGE)
        parts.append(raw.loc[ok, ["ID", "Date", v]].rename(columns={v: "sm"}))
    out = pd.concat(parts).groupby(["ID", "Date"], as_index=False)["sm"].mean()
    out["date"] = pd.to_datetime(out["Date"])
    return out.rename(columns={"ID": "site"})[["site", "date", "sm"]].sort_values(["site", "date"]).reset_index(drop=True)


def load_smap() -> tuple[pd.DataFrame, dict]:
    frames, coords = [], {}
    for f in SMAP_FILES + sorted(HISTORY_DIR.glob("*SPL3SMP*.csv")):
        d = pd.read_csv(f)
        col = lambda end: next(c for c in d.columns if c.endswith(end))  # noqa: E731
        frames.append(pd.DataFrame({
            "ID": d["ID"], "Date": d["Date"],
            "am": d[col("Retrieval_Data_AM_soil_moisture")], "am_flag": d[col("Retrieval_Data_AM_retrieval_qual_flag")],
            "pm": d[col("Retrieval_Data_PM_soil_moisture_pm")], "pm_flag": d[col("Retrieval_Data_PM_retrieval_qual_flag_pm")],
        }))
        for sid, g in d.groupby("ID"):
            coords[sid] = (round(float(g["Latitude"].iloc[0]), 4), round(float(g["Longitude"].iloc[0]), 4))
    return clean_smap(pd.concat(frames)), coords


def fetch_power(site: str, lat: float, lon: float, start: str, end: str) -> pd.DataFrame:
    """NASA POWER daily point data for one site, cached in data/raw/power/ml/."""
    POWER_DIR.mkdir(parents=True, exist_ok=True)
    path = POWER_DIR / f"{site}.json"
    if path.exists():
        cached = power_frame(json.loads(path.read_text(encoding="utf-8"))["response"])
        if cached.index.min() > pd.Timestamp(start) + pd.Timedelta(days=5):
            path.unlink()  # cached range too short for the history; fetch again
    if not path.exists():
        import requests
        params = {"parameters": ",".join(PARAMS), "community": "AG", "latitude": lat, "longitude": lon,
                  "start": start, "end": end, "format": "JSON"}
        for attempt in range(4):
            r = requests.get("https://power.larc.nasa.gov/api/temporal/daily/point", params=params, timeout=240,
                             headers={"User-Agent": "fieldshift-demo/0.2"})
            if r.status_code == 200:
                break
            time.sleep(2 ** (attempt + 1))
        r.raise_for_status()
        path.write_text(json.dumps({"site": site, "lat": lat, "lon": lon, "retrieved_at": utc_now(),
                                    "response": r.json()}), encoding="utf-8")
        time.sleep(1)
    return power_frame(json.loads(path.read_text(encoding="utf-8"))["response"])


def power_frame(resp: dict) -> pd.DataFrame:
    p = resp["properties"]["parameter"]
    df = pd.DataFrame({k: pd.Series(v) for k, v in p.items() if k in PARAMS})
    df.index = pd.to_datetime(df.index, format="%Y%m%d")
    return df.replace(-999.0, np.nan).sort_index()


def features(power: pd.DataFrame) -> pd.DataFrame:
    """Daily inputs. Rain windows include today; too little history gives NaN, never zero."""
    f = pd.DataFrame(index=power.index)
    rain = power["PRECTOTCORR"]
    for w in RAIN_WINDOWS:
        f[f"rain_{w}d"] = rain.rolling(w, min_periods=w).sum()
    for c in ["T2M_MAX", "T2M_MIN", "RH2M", "ALLSKY_SFC_SW_DWN", "WS2M", "GWETTOP", "GWETROOT"]:
        f[c] = power[c]
    doy = power.index.day_of_year
    f["doy_sin"], f["doy_cos"] = np.sin(2 * np.pi * doy / 365.25), np.cos(2 * np.pi * doy / 365.25)
    return f


FEATURES = [f"rain_{w}d" for w in RAIN_WINDOWS] + ["T2M_MAX", "T2M_MIN", "RH2M", "ALLSKY_SFC_SW_DWN", "WS2M",
                                                   "GWETTOP", "GWETROOT", "doy_sin", "doy_cos"]


def site_cv(groups, k=5):
    """Hold out whole sites: one at a time when there are few, k rotating groups when there are many."""
    from sklearn.model_selection import GroupKFold, LeaveOneGroupOut
    n = pd.Series(groups).nunique()
    return LeaveOneGroupOut() if n <= 10 else GroupKFold(n_splits=min(k, n))


def site_folds(df: pd.DataFrame):
    return list(site_cv(df["site"]).split(df, groups=df["site"]))


# ---------- models ----------

BASELINES = ("baseline_mean", "baseline_power_wetness")


def candidates():
    """Every algorithm family worth trying on ~100 rows, each with a small tuning grid.
    Scale-sensitive models get a StandardScaler in the pipeline."""
    from sklearn.dummy import DummyRegressor
    from sklearn.ensemble import (ExtraTreesRegressor, GradientBoostingRegressor, HistGradientBoostingRegressor,
                                  RandomForestRegressor)
    from sklearn.gaussian_process import GaussianProcessRegressor
    from sklearn.gaussian_process.kernels import RBF, WhiteKernel
    from sklearn.linear_model import ElasticNet, Lasso, LinearRegression, Ridge
    from sklearn.neighbors import KNeighborsRegressor
    from sklearn.neural_network import MLPRegressor
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.svm import SVR

    def scaled(m):
        return make_pipeline(StandardScaler(), m)

    return {
        "baseline_mean": (DummyRegressor(), ["GWETTOP"], {}),
        "baseline_power_wetness": (LinearRegression(), ["GWETTOP"], {}),
        "ridge": (scaled(Ridge()), FEATURES, {"ridge__alpha": [0.1, 1, 10, 100]}),
        "lasso": (scaled(Lasso(max_iter=20000)), FEATURES, {"lasso__alpha": [0.0005, 0.002, 0.01]}),
        "elastic_net": (scaled(ElasticNet(max_iter=20000)), FEATURES,
                        {"elasticnet__alpha": [0.001, 0.01], "elasticnet__l1_ratio": [0.2, 0.5, 0.8]}),
        "knn": (scaled(KNeighborsRegressor()), FEATURES,
                {"kneighborsregressor__n_neighbors": [5, 10, 20], "kneighborsregressor__weights": ["uniform", "distance"]}),
        "svr": (scaled(SVR()), FEATURES, {"svr__C": [0.1, 1, 10], "svr__epsilon": [0.01, 0.03]}),
        "random_forest": (RandomForestRegressor(n_estimators=300, random_state=SEED, n_jobs=-1), FEATURES,
                          {"max_depth": [3, 6, None], "min_samples_leaf": [3, 10]}),
        "extra_trees": (ExtraTreesRegressor(n_estimators=300, random_state=SEED, n_jobs=-1), FEATURES,
                        {"max_depth": [3, 6, None], "min_samples_leaf": [3, 10]}),
        "gradient_boosting": (GradientBoostingRegressor(random_state=SEED), FEATURES,
                              {"max_depth": [2, 3], "learning_rate": [0.03, 0.1], "n_estimators": [100, 300],
                               "subsample": [0.7, 1.0]}),
        "boosted_trees": (HistGradientBoostingRegressor(random_state=SEED), FEATURES,
                          {"max_depth": [2, 3], "learning_rate": [0.03, 0.1], "max_iter": [100, 300],
                           "l2_regularization": [0.0, 1.0], "min_samples_leaf": [10, 20]}),
        "gaussian_process": (scaled(GaussianProcessRegressor(kernel=RBF(length_scale=3.0) + WhiteKernel(0.01),
                                                             normalize_y=True, random_state=SEED)), FEATURES, {}),
        "neural_net": (scaled(MLPRegressor(max_iter=3000, early_stopping=False, random_state=SEED)), FEATURES,
                       {"mlpregressor__hidden_layer_sizes": [(16,), (32, 16)], "mlpregressor__alpha": [0.001, 0.1]}),
    }


def tune(model, grid, X, y, groups):
    """Hyperparameter search scored on held-out sites only (inner leave-one-site-out)."""
    from sklearn.model_selection import GridSearchCV
    if not grid:
        return model.fit(X, y), {}
    gs = GridSearchCV(model, grid, cv=site_cv(groups, k=3), scoring="neg_root_mean_squared_error", n_jobs=-1)
    gs.fit(X, y, groups=groups)
    return gs.best_estimator_, gs.best_params_


def scores(y, p) -> dict:
    y, p = np.asarray(y), np.asarray(p)
    rmse = float(np.sqrt(np.mean((y - p) ** 2)))
    ss = float(np.sum((y - y.mean()) ** 2))
    return {"rmse": round(rmse, 4), "mae": round(float(np.mean(np.abs(y - p))), 4),
            "r2": round(1 - float(np.sum((y - p) ** 2)) / ss, 3) if ss else None, "n": int(len(y))}


def cap(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """Slow algorithms train on a fixed random sample of the training rows (never the test rows)."""
    n = MAX_ROWS.get(name)
    return df.sample(n=n, random_state=SEED) if n and len(df) > n else df


def inner_rmse(name: str, df: pd.DataFrame) -> float:
    """Best held-out-site RMSE this algorithm reaches when tuned on df alone."""
    from sklearn.base import clone
    from sklearn.model_selection import GridSearchCV, cross_val_score
    model, cols, grid = candidates()[name]
    d = cap(df, name)
    cv = site_cv(d["site"], k=3)
    if grid:
        gs = GridSearchCV(clone(model), grid, cv=cv, scoring="neg_root_mean_squared_error", n_jobs=-1)
        gs.fit(d[cols], d["sm"], groups=d["site"])
        return float(-gs.best_score_)
    return float(-cross_val_score(clone(model), d[cols], d["sm"], groups=d["site"], cv=cv,
                                  scoring="neg_root_mean_squared_error", n_jobs=-1).mean())


def nested_selection(df: pd.DataFrame, names=None, on_fold=None) -> dict:
    """Honest score for 'pick the best algorithm': for each held-out site, the algorithm and its
    settings are chosen using the other sites only, then scored on the held-out site."""
    cands = candidates()
    names = names or [n for n in cands if n not in BASELINES]
    preds, picks = np.empty(len(df)), []
    for train, test in site_folds(df):
        tr, te = df.iloc[train], df.iloc[test]
        best = min(names, key=lambda n: inner_rmse(n, tr))
        model, cols, grid = cands[best]
        trc = cap(tr, best)
        m, _ = tune(model, grid, trc[cols], trc["sm"], trc["site"])
        preds[test] = m.predict(te[cols])
        picks.append({"held_out": ", ".join(sorted(map(str, te["site"].unique())))[:120], "picked": best})
        if on_fold:
            on_fold(set(tr["site"]), te["site"].iloc[0], best)
    return {**scores(df["sm"], preds), "picks": picks}


def evaluate(df: pd.DataFrame) -> dict:
    """Outer leave-one-site-out (tuning happens inside each fold) and a later-months holdout."""
    out = {}
    for name, (model, cols, grid) in candidates().items():
        preds = np.empty(len(df))
        for train, test in site_folds(df):
            tr = cap(df.iloc[train], name)
            m, _ = tune(model, grid, tr[cols], tr["sm"], tr["site"])
            preds[test] = m.predict(df.iloc[test][cols])
        cut = df["date"].quantile(0.75)
        tr, te = cap(df[df["date"] < cut], name), df[df["date"] >= cut]
        m, _ = tune(model, grid, tr[cols], tr["sm"], tr["site"])
        print(f"  tested {name}", flush=True)
        out[name] = {"unseen_sites": scores(df["sm"], preds),
                     "later_months": {**scores(te["sm"], m.predict(te[cols])), "from": str(cut.date())}}
    return out


# ---------- run ----------

def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def town_inputs() -> dict:
    """Latest feature rows for the four reference towns, from the POWER files the app already uses."""
    out = {}
    for path in sorted((DATA / "raw" / "power").glob("recent_*.json")):
        f = features(power_frame(json.loads(path.read_text(encoding="utf-8"))["response"])).dropna()
        out[path.stem.removeprefix("recent_")] = f
    return out


def main():
    smap, coords = load_smap()
    start = (smap["date"].min() - pd.Timedelta(days=40)).strftime("%Y%m%d")
    end = (pd.Timestamp(date.today()) - pd.Timedelta(days=2)).strftime("%Y%m%d")
    rows = []
    have = set(smap["site"])
    for site, (lat, lon) in sorted(coords.items()):
        if site not in have:  # no recommended-quality SMAP reading at this point (sea, river, wet paddy)
            continue
        f = features(fetch_power(site, lat, lon, start, end))
        print(f"  weather ready: {site}", flush=True)
        s = smap[smap["site"] == site].set_index("date")
        rows.append(s.join(f, how="inner").reset_index())
    df = pd.concat(rows).dropna(subset=FEATURES + ["sm"]).reset_index(drop=True)
    CLEAN.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(CLEAN, index=False)  # small, committed; the raw AppEEARS CSVs are not
    print(f"training rows: {len(df)} from {df['site'].nunique()} sites, {df['date'].min().date()} to {df['date'].max().date()}")

    results = evaluate(df)
    for k, v in sorted(results.items(), key=lambda kv: kv[1]["unseen_sites"]["rmse"]):
        print(f"{k:24s} unseen sites RMSE {v['unseen_sites']['rmse']:.4f} R2 {v['unseen_sites']['r2']}  "
              f"later months RMSE {v['later_months']['rmse']:.4f}")

    # Honest score for "pick the best algorithm", then compare it with the simple baselines.
    nested = nested_selection(df)
    print(f"{'NESTED best-algorithm':24s} unseen sites RMSE {nested['rmse']:.4f} R2 {nested['r2']}  picks {nested['picks']}")
    beats = all(nested["rmse"] < results[b]["unseen_sites"]["rmse"] for b in BASELINES)

    cands = candidates()
    algos = [n for n in cands if n not in BASELINES]
    best = min(algos, key=lambda n: inner_rmse(n, df))
    model, cols, grid = cands[best]
    dfc = cap(df, best)
    final, params = tune(model, grid, dfc[cols], dfc["sm"], dfc["site"])

    estimates = {}
    if beats:
        for town, f in town_inputs().items():
            last = f.iloc[-30:]
            pred = np.clip(final.predict(last[cols]), *SM_RANGE)
            estimates[town] = {"date": str(last.index[-1].date()), "value": round(float(pred[-1]), 3),
                               "last_30_days": [round(float(x), 3) for x in pred]}

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "model": best, "published": beats, "params": {k: (v if isinstance(v, (int, float, str)) else str(v)) for k, v in params.items()},
        "features": cols, "trained_at": utc_now(), "seed": SEED,
        "training": {"rows": int(len(df)), "sites": sorted(df["site"].unique().tolist()),
                     "from": str(df["date"].min().date()), "to": str(df["date"].max().date()),
                     "target": "SMAP SPL3SMP_E v006 soil_moisture, AM/PM mean, quality 'recommended', 9 km",
                     "inputs": "NASA POWER daily point data (community AG)"},
        "evaluation": results,
        "nested_selection": nested,
        "publish_rule": "Shown only if the nested best-algorithm score beats both baselines on unseen sites.",
        "estimates": estimates,
        "label": "Model estimate, not a measurement. Trained on NASA SMAP and NASA POWER.",
    }, indent=2), encoding="utf-8")
    print(f"best: {best} {params}  beats baselines on unseen sites: {beats}\nwrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
