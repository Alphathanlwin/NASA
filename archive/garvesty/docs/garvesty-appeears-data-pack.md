# Garvesty — AppEEARS data pack: Paw San Ayeyarwady + Field Shift demo fields

One file for both AppEEARS pulls: what the data is, the cleaned time series,
how to use it, and what it actually means. Everything here is verified from
the downloaded CSVs — nothing is invented, and what is missing is named.

## Status (read this first)

| Dataset | Status |
|---|---|
| **Paw San Ayeyarwady** (`pawsan-ayeyarwady`) | **COMPLETE** — downloaded, verified, run through the pipeline. Cleaned series in §2. |
| **Field Shift demo fields** (`fieldshift-demo-fields`, F-01..F-06) | **MISSING** — the AppEEARS task finished (Done 14:21, 14 Nov 2026) but its CSVs were never downloaded; the request was deleted from the AppEEARS page before download. This file does NOT contain that data. Recovery spec in §6. |
| Old generic pull (`Field Shift SMAP Yangon demo`) | **EXCLUDED on purpose** — 3 generic points, only 5 of 126 rows pass the QA gate, IDs don't match any field. Do not use it. |

## 1. Dataset inventory

### 1.1 Paw San Ayeyarwady — `pawsan-ayeyarwady`

- **AppEEARS task ID:** `14cb26b2-28d6-4415-b328-38c29df7865e`
- **Submitted:** 14 Nov 2026, 13:20:33 GMT+6:30 · **Completed:** 14 Nov 2026, 14:25:16 GMT+6:30
- **Type:** POINT task, 7 points, dates 2025-10-10 → 2026-11-14 (400 days)
- **Products / layers:** MOD13Q1.061 (`_250m_16_days_NDVI`, `_250m_16_days_EVI`,
  `_250m_16_days_pixel_reliability`) + SPL3SMP_E.006 (AM `soil_moisture`, PM
  `soil_moisture_pm`, AM `retrieval_qual_flag`, PM `retrieval_qual_flag_pm`)
- **Points (ID, lat, lon):** myaungmya (16.60024, 94.92314), pathein (16.78411,
  94.73261), pyapon (16.29498, 95.67052), bogale (16.28596, 95.40944), dedaye
  (16.36504, 95.80740), kyaiklat (16.50877, 95.70505), maubin (16.72845, 95.64413)
- **Files (as downloaded):**
  - `pawsan-ayeyarwady-MOD13Q1-061-results.csv` — 65,082 bytes, 175 data rows,
    25 composites, 2025-09-30 → 2026-10-16
  - `pawsan-ayeyarwady-SPL3SMP-E-006-results.csv` — 1,274,337 bytes, 2,786 data
    rows, 398 days, 2025-10-10 → 2026-11-12
- **IDs exactly as returned** (column header `ID`; the `Category` column is empty
  in every row): `bogale, dedaye, kyaiklat, maubin, myaungmya, pathein, pyapon` —
  plain lowercase, no spaces or suffixes, exactly as submitted. Each ID appears in
  25 MODIS rows and 398 SMAP rows.

### 1.2 Field Shift demo fields — `fieldshift-demo-fields` (MISSING)

- **Submitted:** 14 Nov 2026, 13:06:38 GMT+6:30 · **Completed:** 14 Nov 2026, 14:21:09 GMT+6:30
- **Type:** POINT task, 6 points (F-01..F-06, the fields.geojson centroids),
  dates 2025-10-10 → 2026-11-14 (400 days), same 7 layers as above
- **What it would have contained:** MODIS NDVI/EVI + SMAP soil moisture for the
  six Twante demo fields — the data that turns the snapshot's `ndvi`/`smap` from
  NOT_CONNECTED to CACHED. Recovery spec in §6.

### 1.3 QA verdicts (verified from the CSVs)

**MODIS NDVI — clean win.** NDVI present in 175/175 rows (range 0.103–0.790).
Note: AppEEARS returns NDVI already decimal-scaled (0.4832, not 4832) — a check
that parses it as a scaled integer falsely reports 0 valid values. After the
cleaner's gate (NDVI valid + pixel_reliability 0 good / 1 marginal), 126 rows
pass; 49 are dropped for reliability 3 (cloud). All 7 townships have series.

**SMAP — sparse, and the sparsity is the finding.** AM valid 329/2,786 (11.8%),
PM valid 427/2,786 (15.3%). The repo gate (qual flag 0 or 8 AND 0 ≤ moisture ≤
0.6) passes only 128 retrievals: AM 55, PM 73. Passing days per township:
myaungmya 52, pyapon 41, pathein 21 — and **bogale, dedaye, kyaiklat, maubin
have ZERO QA-passing SMAP retrievals in 400 days** (their valid values all carry
qual flag 9 or 13, not recommended). The cleaner drops them, correctly and
silently — the absence is data, not a bug. Never fill it in by hand.

## 2. The cleaned time series (Paw San)

These are the pipeline outputs (`data/clean/ndvi.json` and `data/clean/smap.json`
after `pipeline/clean_all.py`). This is the form the app consumes — not the raw
CSVs. Values are exactly as the cleaner wrote them.

### 2.1 NDVI + EVI per township (126 composites, reliability 0/1 only)

```json
{
 "bogale": [
  {
   "date": "2025-10-16",
   "ndvi": 0.695,
   "evi": 0.438,
   "marginal": false
  },
  {
   "date": "2025-11-01",
   "ndvi": 0.648,
   "evi": 0.46,
   "marginal": false
  },
  {
   "date": "2025-11-17",
   "ndvi": 0.656,
   "evi": 0.394,
   "marginal": false
  },
  {
   "date": "2025-12-03",
   "ndvi": 0.635,
   "evi": 0.449,
   "marginal": false
  },
  {
   "date": "2025-12-19",
   "ndvi": 0.665,
   "evi": 0.372,
   "marginal": false
  },
  {
   "date": "2026-01-01",
   "ndvi": 0.582,
   "evi": 0.316,
   "marginal": false
  },
  {
   "date": "2026-01-17",
   "ndvi": 0.609,
   "evi": 0.325,
   "marginal": false
  },
  {
   "date": "2026-02-02",
   "ndvi": 0.646,
   "evi": 0.376,
   "marginal": false
  },
  {
   "date": "2026-02-18",
   "ndvi": 0.616,
   "evi": 0.364,
   "marginal": false
  },
  {
   "date": "2026-03-06",
   "ndvi": 0.665,
   "evi": 0.445,
   "marginal": false
  },
  {
   "date": "2026-03-22",
   "ndvi": 0.577,
   "evi": 0.355,
   "marginal": false
  },
  {
   "date": "2026-04-07",
   "ndvi": 0.579,
   "evi": 0.368,
   "marginal": false
  },
  {
   "date": "2026-04-23",
   "ndvi": 0.648,
   "evi": 0.427,
   "marginal": false
  },
  {
   "date": "2026-08-13",
   "ndvi": 0.7,
   "evi": 0.301,
   "marginal": false
  },
  {
   "date": "2026-08-29",
   "ndvi": 0.714,
   "evi": 0.449,
   "marginal": false
  },
  {
   "date": "2026-09-14",
   "ndvi": 0.702,
   "evi": 0.489,
   "marginal": true
  },
  {
   "date": "2026-09-30",
   "ndvi": 0.673,
   "evi": 0.527,
   "marginal": false
  },
  {
   "date": "2026-10-16",
   "ndvi": 0.692,
   "evi": 0.465,
   "marginal": false
  }
 ],
 "dedaye": [
  {
   "date": "2025-10-16",
   "ndvi": 0.36,
   "evi": 0.198,
   "marginal": false
  },
  {
   "date": "2025-11-01",
   "ndvi": 0.42,
   "evi": 0.237,
   "marginal": false
  },
  {
   "date": "2025-11-17",
   "ndvi": 0.375,
   "evi": 0.18,
   "marginal": false
  },
  {
   "date": "2025-12-03",
   "ndvi": 0.692,
   "evi": 0.461,
   "marginal": false
  },
  {
   "date": "2025-12-19",
   "ndvi": 0.76,
   "evi": 0.475,
   "marginal": false
  },
  {
   "date": "2026-01-01",
   "ndvi": 0.79,
   "evi": 0.533,
   "marginal": true
  },
  {
   "date": "2026-01-17",
   "ndvi": 0.787,
   "evi": 0.521,
   "marginal": false
  },
  {
   "date": "2026-02-02",
   "ndvi": 0.716,
   "evi": 0.429,
   "marginal": false
  },
  {
   "date": "2026-02-18",
   "ndvi": 0.561,
   "evi": 0.347,
   "marginal": true
  },
  {
   "date": "2026-03-06",
   "ndvi": 0.403,
   "evi": 0.23,
   "marginal": false
  },
  {
   "date": "2026-03-22",
   "ndvi": 0.452,
   "evi": 0.244,
   "marginal": true
  },
  {
   "date": "2026-04-07",
   "ndvi": 0.459,
   "evi": 0.251,
   "marginal": true
  },
  {
   "date": "2026-04-23",
   "ndvi": 0.512,
   "evi": 0.32,
   "marginal": true
  },
  {
   "date": "2026-09-14",
   "ndvi": 0.337,
   "evi": 0.151,
   "marginal": false
  },
  {
   "date": "2026-10-16",
   "ndvi": 0.266,
   "evi": 0.12,
   "marginal": false
  }
 ],
 "kyaiklat": [
  {
   "date": "2025-09-30",
   "ndvi": 0.56,
   "evi": 0.302,
   "marginal": false
  },
  {
   "date": "2025-10-16",
   "ndvi": 0.681,
   "evi": 0.409,
   "marginal": false
  },
  {
   "date": "2025-11-01",
   "ndvi": 0.595,
   "evi": 0.344,
   "marginal": false
  },
  {
   "date": "2025-11-17",
   "ndvi": 0.581,
   "evi": 0.338,
   "marginal": false
  },
  {
   "date": "2025-12-03",
   "ndvi": 0.582,
   "evi": 0.362,
   "marginal": false
  },
  {
   "date": "2025-12-19",
   "ndvi": 0.585,
   "evi": 0.314,
   "marginal": false
  },
  {
   "date": "2026-01-01",
   "ndvi": 0.688,
   "evi": 0.372,
   "marginal": false
  },
  {
   "date": "2026-01-17",
   "ndvi": 0.679,
   "evi": 0.377,
   "marginal": false
  },
  {
   "date": "2026-02-02",
   "ndvi": 0.763,
   "evi": 0.464,
   "marginal": false
  },
  {
   "date": "2026-02-18",
   "ndvi": 0.733,
   "evi": 0.535,
   "marginal": true
  },
  {
   "date": "2026-03-06",
   "ndvi": 0.578,
   "evi": 0.385,
   "marginal": false
  },
  {
   "date": "2026-03-22",
   "ndvi": 0.643,
   "evi": 0.565,
   "marginal": false
  },
  {
   "date": "2026-04-07",
   "ndvi": 0.651,
   "evi": 0.41,
   "marginal": true
  },
  {
   "date": "2026-04-23",
   "ndvi": 0.507,
   "evi": 0.365,
   "marginal": false
  },
  {
   "date": "2026-06-10",
   "ndvi": 0.658,
   "evi": 0.27,
   "marginal": false
  },
  {
   "date": "2026-08-13",
   "ndvi": 0.642,
   "evi": 0.377,
   "marginal": false
  },
  {
   "date": "2026-08-29",
   "ndvi": 0.761,
   "evi": 0.491,
   "marginal": false
  },
  {
   "date": "2026-09-14",
   "ndvi": 0.722,
   "evi": 0.253,
   "marginal": true
  },
  {
   "date": "2026-09-30",
   "ndvi": 0.675,
   "evi": 0.391,
   "marginal": true
  },
  {
   "date": "2026-10-16",
   "ndvi": 0.728,
   "evi": 0.509,
   "marginal": false
  }
 ],
 "maubin": [
  {
   "date": "2025-09-30",
   "ndvi": 0.572,
   "evi": 0.29,
   "marginal": true
  },
  {
   "date": "2025-10-16",
   "ndvi": 0.512,
   "evi": 0.274,
   "marginal": false
  },
  {
   "date": "2025-11-01",
   "ndvi": 0.606,
   "evi": 0.445,
   "marginal": false
  },
  {
   "date": "2025-11-17",
   "ndvi": 0.569,
   "evi": 0.336,
   "marginal": false
  },
  {
   "date": "2025-12-03",
   "ndvi": 0.5,
   "evi": 0.334,
   "marginal": false
  },
  {
   "date": "2025-12-19",
   "ndvi": 0.591,
   "evi": 0.326,
   "marginal": false
  },
  {
   "date": "2026-01-01",
   "ndvi": 0.498,
   "evi": 0.256,
   "marginal": false
  },
  {
   "date": "2026-01-17",
   "ndvi": 0.475,
   "evi": 0.242,
   "marginal": false
  },
  {
   "date": "2026-02-02",
   "ndvi": 0.456,
   "evi": 0.242,
   "marginal": false
  },
  {
   "date": "2026-02-18",
   "ndvi": 0.458,
   "evi": 0.252,
   "marginal": false
  },
  {
   "date": "2026-03-06",
   "ndvi": 0.51,
   "evi": 0.318,
   "marginal": false
  },
  {
   "date": "2026-03-22",
   "ndvi": 0.429,
   "evi": 0.26,
   "marginal": false
  },
  {
   "date": "2026-04-07",
   "ndvi": 0.449,
   "evi": 0.254,
   "marginal": false
  },
  {
   "date": "2026-04-23",
   "ndvi": 0.421,
   "evi": 0.25,
   "marginal": false
  },
  {
   "date": "2026-05-25",
   "ndvi": 0.545,
   "evi": 0.337,
   "marginal": true
  },
  {
   "date": "2026-06-10",
   "ndvi": 0.512,
   "evi": 0.328,
   "marginal": true
  },
  {
   "date": "2026-08-13",
   "ndvi": 0.511,
   "evi": 0.242,
   "marginal": true
  },
  {
   "date": "2026-09-30",
   "ndvi": 0.547,
   "evi": 0.334,
   "marginal": false
  },
  {
   "date": "2026-10-16",
   "ndvi": 0.57,
   "evi": 0.383,
   "marginal": false
  }
 ],
 "myaungmya": [
  {
   "date": "2025-09-30",
   "ndvi": 0.678,
   "evi": 0.335,
   "marginal": true
  },
  {
   "date": "2025-10-16",
   "ndvi": 0.697,
   "evi": 0.417,
   "marginal": false
  },
  {
   "date": "2025-11-01",
   "ndvi": 0.701,
   "evi": 0.387,
   "marginal": false
  },
  {
   "date": "2025-11-17",
   "ndvi": 0.696,
   "evi": 0.394,
   "marginal": false
  },
  {
   "date": "2025-12-03",
   "ndvi": 0.606,
   "evi": 0.415,
   "marginal": false
  },
  {
   "date": "2025-12-19",
   "ndvi": 0.671,
   "evi": 0.357,
   "marginal": false
  },
  {
   "date": "2026-01-01",
   "ndvi": 0.608,
   "evi": 0.292,
   "marginal": true
  },
  {
   "date": "2026-01-17",
   "ndvi": 0.596,
   "evi": 0.288,
   "marginal": false
  },
  {
   "date": "2026-02-02",
   "ndvi": 0.587,
   "evi": 0.29,
   "marginal": false
  },
  {
   "date": "2026-02-18",
   "ndvi": 0.565,
   "evi": 0.377,
   "marginal": true
  },
  {
   "date": "2026-03-06",
   "ndvi": 0.576,
   "evi": 0.322,
   "marginal": true
  },
  {
   "date": "2026-03-22",
   "ndvi": 0.583,
   "evi": 0.326,
   "marginal": true
  },
  {
   "date": "2026-04-07",
   "ndvi": 0.557,
   "evi": 0.304,
   "marginal": true
  },
  {
   "date": "2026-04-23",
   "ndvi": 0.556,
   "evi": 0.331,
   "marginal": true
  },
  {
   "date": "2026-08-29",
   "ndvi": 0.751,
   "evi": 0.467,
   "marginal": true
  },
  {
   "date": "2026-09-30",
   "ndvi": 0.756,
   "evi": 0.491,
   "marginal": false
  },
  {
   "date": "2026-10-16",
   "ndvi": 0.694,
   "evi": 0.449,
   "marginal": false
  }
 ],
 "pathein": [
  {
   "date": "2025-09-30",
   "ndvi": 0.455,
   "evi": 0.235,
   "marginal": true
  },
  {
   "date": "2025-10-16",
   "ndvi": 0.577,
   "evi": 0.337,
   "marginal": false
  },
  {
   "date": "2025-11-01",
   "ndvi": 0.567,
   "evi": 0.335,
   "marginal": false
  },
  {
   "date": "2025-11-17",
   "ndvi": 0.539,
   "evi": 0.287,
   "marginal": false
  },
  {
   "date": "2025-12-03",
   "ndvi": 0.51,
   "evi": 0.264,
   "marginal": false
  },
  {
   "date": "2025-12-19",
   "ndvi": 0.491,
   "evi": 0.236,
   "marginal": false
  },
  {
   "date": "2026-01-01",
   "ndvi": 0.484,
   "evi": 0.237,
   "marginal": false
  },
  {
   "date": "2026-01-17",
   "ndvi": 0.436,
   "evi": 0.203,
   "marginal": false
  },
  {
   "date": "2026-02-02",
   "ndvi": 0.449,
   "evi": 0.229,
   "marginal": false
  },
  {
   "date": "2026-02-18",
   "ndvi": 0.489,
   "evi": 0.276,
   "marginal": false
  },
  {
   "date": "2026-03-06",
   "ndvi": 0.51,
   "evi": 0.289,
   "marginal": false
  },
  {
   "date": "2026-03-22",
   "ndvi": 0.499,
   "evi": 0.287,
   "marginal": false
  },
  {
   "date": "2026-04-07",
   "ndvi": 0.472,
   "evi": 0.267,
   "marginal": false
  },
  {
   "date": "2026-04-23",
   "ndvi": 0.431,
   "evi": 0.242,
   "marginal": false
  },
  {
   "date": "2026-08-13",
   "ndvi": 0.665,
   "evi": 0.31,
   "marginal": true
  },
  {
   "date": "2026-08-29",
   "ndvi": 0.607,
   "evi": 0.361,
   "marginal": false
  },
  {
   "date": "2026-09-30",
   "ndvi": 0.58,
   "evi": 0.332,
   "marginal": false
  },
  {
   "date": "2026-10-16",
   "ndvi": 0.546,
   "evi": 0.308,
   "marginal": false
  }
 ],
 "pyapon": [
  {
   "date": "2025-09-30",
   "ndvi": 0.622,
   "evi": 0.351,
   "marginal": true
  },
  {
   "date": "2025-10-16",
   "ndvi": 0.582,
   "evi": 0.321,
   "marginal": false
  },
  {
   "date": "2025-11-01",
   "ndvi": 0.597,
   "evi": 0.333,
   "marginal": false
  },
  {
   "date": "2025-11-17",
   "ndvi": 0.589,
   "evi": 0.312,
   "marginal": false
  },
  {
   "date": "2025-12-03",
   "ndvi": 0.623,
   "evi": 0.396,
   "marginal": false
  },
  {
   "date": "2025-12-19",
   "ndvi": 0.575,
   "evi": 0.284,
   "marginal": false
  },
  {
   "date": "2026-01-01",
   "ndvi": 0.552,
   "evi": 0.262,
   "marginal": false
  },
  {
   "date": "2026-01-17",
   "ndvi": 0.591,
   "evi": 0.285,
   "marginal": false
  },
  {
   "date": "2026-02-02",
   "ndvi": 0.559,
   "evi": 0.315,
   "marginal": false
  },
  {
   "date": "2026-02-18",
   "ndvi": 0.602,
   "evi": 0.4,
   "marginal": false
  },
  {
   "date": "2026-03-06",
   "ndvi": 0.495,
   "evi": 0.266,
   "marginal": false
  },
  {
   "date": "2026-03-22",
   "ndvi": 0.567,
   "evi": 0.437,
   "marginal": false
  },
  {
   "date": "2026-04-07",
   "ndvi": 0.513,
   "evi": 0.291,
   "marginal": true
  },
  {
   "date": "2026-04-23",
   "ndvi": 0.583,
   "evi": 0.446,
   "marginal": false
  },
  {
   "date": "2026-05-25",
   "ndvi": 0.563,
   "evi": 0.361,
   "marginal": true
  },
  {
   "date": "2026-08-29",
   "ndvi": 0.625,
   "evi": 0.355,
   "marginal": false
  },
  {
   "date": "2026-09-14",
   "ndvi": 0.659,
   "evi": 0.496,
   "marginal": false
  },
  {
   "date": "2026-09-30",
   "ndvi": 0.674,
   "evi": 0.568,
   "marginal": false
  },
  {
   "date": "2026-10-16",
   "ndvi": 0.65,
   "evi": 0.398,
   "marginal": false
  }
 ]
}
```

### 2.2 SMAP soil moisture per township (114 QA-passing field-days, 3 townships only)

```json
{
 "myaungmya": [
  {
   "date": "2025-12-17",
   "sm": 0.024
  },
  {
   "date": "2026-01-18",
   "sm": 0.09
  },
  {
   "date": "2026-01-23",
   "sm": 0.108
  },
  {
   "date": "2026-01-26",
   "sm": 0.08
  },
  {
   "date": "2026-02-03",
   "sm": 0.029
  },
  {
   "date": "2026-02-11",
   "sm": 0.025
  },
  {
   "date": "2026-02-16",
   "sm": 0.058
  },
  {
   "date": "2026-02-19",
   "sm": 0.07
  },
  {
   "date": "2026-03-10",
   "sm": 0.116
  },
  {
   "date": "2026-03-12",
   "sm": 0.121
  },
  {
   "date": "2026-03-15",
   "sm": 0.085
  },
  {
   "date": "2026-03-22",
   "sm": 0.099
  },
  {
   "date": "2026-03-30",
   "sm": 0.052
  },
  {
   "date": "2026-04-08",
   "sm": 0.089
  },
  {
   "date": "2026-04-19",
   "sm": 0.106
  },
  {
   "date": "2026-04-24",
   "sm": 0.114
  },
  {
   "date": "2026-04-27",
   "sm": 0.062
  },
  {
   "date": "2026-05-01",
   "sm": 0.064
  },
  {
   "date": "2026-05-10",
   "sm": 0.08
  },
  {
   "date": "2026-05-15",
   "sm": 0.174
  },
  {
   "date": "2026-05-17",
   "sm": 0.205
  },
  {
   "date": "2026-05-18",
   "sm": 0.24
  },
  {
   "date": "2026-05-21",
   "sm": 0.226
  },
  {
   "date": "2026-05-23",
   "sm": 0.403
  },
  {
   "date": "2026-05-25",
   "sm": 0.166
  },
  {
   "date": "2026-05-26",
   "sm": 0.304
  },
  {
   "date": "2026-06-03",
   "sm": 0.244
  },
  {
   "date": "2026-06-11",
   "sm": 0.237
  },
  {
   "date": "2026-06-14",
   "sm": 0.257
  },
  {
   "date": "2026-06-26",
   "sm": 0.189
  },
  {
   "date": "2026-06-27",
   "sm": 0.278
  },
  {
   "date": "2026-07-10",
   "sm": 0.103
  },
  {
   "date": "2026-07-13",
   "sm": 0.251
  },
  {
   "date": "2026-07-16",
   "sm": 0.412
  },
  {
   "date": "2026-07-18",
   "sm": 0.295
  },
  {
   "date": "2026-07-21",
   "sm": 0.38
  },
  {
   "date": "2026-07-29",
   "sm": 0.196
  },
  {
   "date": "2026-08-03",
   "sm": 0.245
  },
  {
   "date": "2026-08-05",
   "sm": 0.155
  },
  {
   "date": "2026-08-06",
   "sm": 0.171
  },
  {
   "date": "2026-08-14",
   "sm": 0.233
  },
  {
   "date": "2026-08-27",
   "sm": 0.144
  },
  {
   "date": "2026-08-30",
   "sm": 0.31
  },
  {
   "date": "2026-09-02",
   "sm": 0.171
  },
  {
   "date": "2026-09-23",
   "sm": 0.097
  },
  {
   "date": "2026-10-09",
   "sm": 0.114
  },
  {
   "date": "2026-10-20",
   "sm": 0.053
  },
  {
   "date": "2026-11-02",
   "sm": 0.127
  },
  {
   "date": "2026-11-05",
   "sm": 0.116
  },
  {
   "date": "2026-11-07",
   "sm": 0.103
  },
  {
   "date": "2026-11-09",
   "sm": 0.103
  },
  {
   "date": "2026-11-10",
   "sm": 0.139
  }
 ],
 "pathein": [
  {
   "date": "2025-11-04",
   "sm": 0.045
  },
  {
   "date": "2025-11-26",
   "sm": 0.102
  },
  {
   "date": "2026-01-05",
   "sm": 0.363
  },
  {
   "date": "2026-01-26",
   "sm": 0.061
  },
  {
   "date": "2026-02-08",
   "sm": 0.094
  },
  {
   "date": "2026-05-18",
   "sm": 0.082
  },
  {
   "date": "2026-05-23",
   "sm": 0.312
  },
  {
   "date": "2026-06-03",
   "sm": 0.246
  },
  {
   "date": "2026-06-11",
   "sm": 0.09
  },
  {
   "date": "2026-07-05",
   "sm": 0.131
  },
  {
   "date": "2026-07-21",
   "sm": 0.481
  },
  {
   "date": "2026-07-28",
   "sm": 0.129
  },
  {
   "date": "2026-08-29",
   "sm": 0.115
  },
  {
   "date": "2026-09-02",
   "sm": 0.431
  },
  {
   "date": "2026-09-18",
   "sm": 0.428
  },
  {
   "date": "2026-09-26",
   "sm": 0.368
  },
  {
   "date": "2026-10-04",
   "sm": 0.33
  },
  {
   "date": "2026-10-17",
   "sm": 0.099
  },
  {
   "date": "2026-10-30",
   "sm": 0.059
  },
  {
   "date": "2026-11-02",
   "sm": 0.053
  },
  {
   "date": "2026-11-10",
   "sm": 0.155
  }
 ],
 "pyapon": [
  {
   "date": "2025-10-30",
   "sm": 0.182
  },
  {
   "date": "2025-11-28",
   "sm": 0.162
  },
  {
   "date": "2025-12-17",
   "sm": 0.153
  },
  {
   "date": "2026-01-10",
   "sm": 0.1
  },
  {
   "date": "2026-01-26",
   "sm": 0.162
  },
  {
   "date": "2026-03-12",
   "sm": 0.109
  },
  {
   "date": "2026-04-19",
   "sm": 0.052
  },
  {
   "date": "2026-04-21",
   "sm": 0.168
  },
  {
   "date": "2026-04-24",
   "sm": 0.057
  },
  {
   "date": "2026-05-02",
   "sm": 0.088
  },
  {
   "date": "2026-05-07",
   "sm": 0.121
  },
  {
   "date": "2026-05-10",
   "sm": 0.11
  },
  {
   "date": "2026-05-13",
   "sm": 0.096
  },
  {
   "date": "2026-05-17",
   "sm": 0.124
  },
  {
   "date": "2026-05-18",
   "sm": 0.165
  },
  {
   "date": "2026-05-23",
   "sm": 0.406
  },
  {
   "date": "2026-05-26",
   "sm": 0.316
  },
  {
   "date": "2026-06-02",
   "sm": 0.239
  },
  {
   "date": "2026-06-06",
   "sm": 0.4
  },
  {
   "date": "2026-06-08",
   "sm": 0.276
  },
  {
   "date": "2026-06-11",
   "sm": 0.333
  },
  {
   "date": "2026-06-26",
   "sm": 0.422
  },
  {
   "date": "2026-06-27",
   "sm": 0.09
  },
  {
   "date": "2026-06-30",
   "sm": 0.316
  },
  {
   "date": "2026-07-05",
   "sm": 0.353
  },
  {
   "date": "2026-07-13",
   "sm": 0.293
  },
  {
   "date": "2026-07-16",
   "sm": 0.209
  },
  {
   "date": "2026-07-21",
   "sm": 0.212
  },
  {
   "date": "2026-07-24",
   "sm": 0.398
  },
  {
   "date": "2026-08-05",
   "sm": 0.321
  },
  {
   "date": "2026-08-19",
   "sm": 0.276
  },
  {
   "date": "2026-08-21",
   "sm": 0.284
  },
  {
   "date": "2026-08-22",
   "sm": 0.284
  },
  {
   "date": "2026-08-27",
   "sm": 0.279
  },
  {
   "date": "2026-08-29",
   "sm": 0.268
  },
  {
   "date": "2026-09-04",
   "sm": 0.315
  },
  {
   "date": "2026-09-06",
   "sm": 0.192
  },
  {
   "date": "2026-10-06",
   "sm": 0.159
  },
  {
   "date": "2026-10-24",
   "sm": 0.163
  },
  {
   "date": "2026-11-07",
   "sm": 0.24
  },
  {
   "date": "2026-11-10",
   "sm": 0.213
  }
 ]
}
```

## 3. What the series actually show (time-series analysis)

### 3.1 NDVI: the monsoon rice curve, with one real anomaly

Monthly mean NDVI per township (cleaned series):

| Township | 2025-09 | 2025-10 | 2025-11 | 2025-12 | 2026-01 | 2026-02 | 2026-03 | 2026-04 | 2026-08 | 2026-09 | 2026-10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bogale | — | 0.695 | 0.652 | 0.650 | 0.595 | 0.631 | 0.621 | 0.613 | 0.707 | 0.688 | 0.692 |
| dedaye | — | 0.360 | 0.397 | 0.726 | 0.788 | 0.639 | 0.427 | 0.486 | — | 0.337 | 0.266 |
| kyaiklat | 0.560 | 0.681 | 0.588 | 0.583 | 0.683 | 0.748 | 0.611 | 0.579 | 0.702 | 0.699 | 0.728 |
| maubin | 0.572 | 0.512 | 0.587 | 0.545 | 0.486 | 0.457 | 0.470 | 0.435 | 0.511 | 0.547 | 0.570 |
| myaungmya | 0.678 | 0.697 | 0.698 | 0.639 | 0.602 | 0.576 | 0.579 | 0.556 | 0.751 | 0.756 | 0.694 |
| pathein | 0.455 | 0.577 | 0.553 | 0.500 | 0.460 | 0.469 | 0.504 | 0.452 | 0.636 | 0.580 | 0.546 |
| pyapon | 0.622 | 0.582 | 0.593 | 0.599 | 0.572 | 0.581 | 0.531 | 0.548 | 0.625 | 0.667 | 0.650 |

Reading it: six townships trace the same monsoon-rice curve — high NDVI through
the Oct–Nov flowering window (0.56–0.70), holding into the Dec–Jan harvest,
sagging in the Feb–Apr dry season, rising again Aug–Oct 2026 with the next
monsoon. That is the shape a healthy single monsoon crop makes, and it is
visible without any model — the satellite is just reporting the season.

**Dedaye is the anomaly, and it stays an anomaly.** Oct–Nov 2025 NDVI is 0.36–0.40
while every other township is 0.51–0.70, then it jumps to 0.73–0.79 in Dec–Jan.
Possible causes: late sowing at that point, a different crop or land cover at the
exact coordinates, or cloud contamination the reliability flag did not catch. The
data does not say which. Do not explain it away in the demo — show it as an
unresolved local check. That is exactly the kind of gap the tool is supposed to
surface, not hide.

**NDVI drops ≥ 0.10 between consecutive composites** (the pipeline's own event
threshold): dedaye 2026-02-02→02-18 (0.716→0.561) and 02-18→03-06
(0.561→0.403) — the dry-season senescence after harvest; kyaiklat 2026-02-18→03-06
(0.733→0.578) and 04-07→04-23 (0.651→0.507); pyapon 2026-02-18→03-06
(0.602→0.495). All in Feb–Apr: the dry season, not a shock. A drop in October
would mean something; a drop in February is the calendar.

**The May–Jul 2026 gap is real.** Almost no composites survive the reliability gate
in the monsoon cloud season. The series is honest about it by being absent — the
app must show the gap, not interpolate across it.

### 3.2 SMAP: the dry season is the signal

Monthly mean soil moisture, QA-passing retrievals only (all passing townships pooled):

| Month | n | Mean | Min | Max |
|---|---|---|---|---|
| 2025-10 | 1 | 0.182 | 0.182 | 0.182 |
| 2025-11 | 3 | 0.103 | 0.045 | 0.162 |
| 2025-12 | 2 | 0.088 | 0.024 | 0.153 |
| 2026-01 | 7 | 0.138 | 0.061 | 0.363 |
| 2026-02 | 5 | 0.055 | 0.025 | 0.094 |
| 2026-03 | 6 | 0.097 | 0.052 | 0.121 |
| 2026-04 | 7 | 0.093 | 0.052 | 0.168 |
| 2026-05 | 19 | 0.194 | 0.064 | 0.406 |
| 2026-06 | 14 | 0.258 | 0.090 | 0.422 |
| 2026-07 | 14 | 0.275 | 0.103 | 0.481 |
| 2026-08 | 13 | 0.237 | 0.115 | 0.321 |
| 2026-09 | 7 | 0.286 | 0.097 | 0.431 |
| 2026-10 | 7 | 0.140 | 0.053 | 0.330 |
| 2026-11 | 9 | 0.139 | 0.053 | 0.240 |

The shape is unambiguous: Feb–Apr 2026 the root zone is dry (means 0.055–0.097,
single readings as low as 0.024–0.025), May is the transition, Jun–Sep is wet
(0.24–0.29). That dry-season floor is the physical reason the rotation engine
pushes a dry-season legume after monsoon rice — the soil cannot carry a second
rice crop without irrigation, and the satellite says so without anyone having to
believe the agronomy textbook.

Myaungmya carries the series (52 passing days) because it is Paw San's home — the
origin farm is there, and the retrievals happen to pass QA there most often.
That is a fact about the sensor, not about the rice. Do not present Myaungmya's
coverage as if all seven townships were equally observed.

### 3.3 Paw San phenology against the curves

Paw San Hmwe is a single rain-fed monsoon crop: sown Jun–Jul, flowering Oct–Nov
(photoperiod-sensitive), harvested Dec–Jan. The NDVI curves agree: the Oct–Nov
plateau is the flowering canopy, the Dec–Jan hold is the grain-filling crop, the
Feb–Apr fall is the harvested field. The SMAP dry-season floor is the same story
from below the ground. Two independent sensors, one season — that agreement is
the strongest evidence in this file, and it cost no modelling at all.

The consequence for the tool: Paw San cannot be replanted late. If a shock hits
in October — flood, late monsoon, input failure — the adaptation is not 'sow Paw
San again'. It is the NEXT season: a dry-season legume on the same field. The
engine already encodes this (legume credit + pest break), and F-01's own history
(monsoon_rice → black_gram) is the proof the farmers already know it.

## 4. How to use it (time series)

### 4.1 The pipeline (the only path data takes into the app)

```
AppEEARS CSVs  →  data/raw/appeears/  →  pipeline/clean_all.py
  →  data/clean/ndvi.json + data/clean/smap.json
  →  data/snapshots/fields_snapshot.json  →  FastAPI  →  F3 / A1 screens
```

- **Stage the raw files** in `data/raw/appeears/` with their AppEEARS names. The
  cleaner finds them by glob (`*MOD13Q1*results.csv`, `*SPL3SMP*results.csv`).
- **Run** `python pipeline/clean_all.py` from the repo root. It is deterministic:
  same raw files in, same clean files out. It also regenerates the snapshot and
  the cleaning report — that is expected, not a side effect to avoid.
- **Never hand-edit the clean files.** If a value looks wrong, fix the raw file or
  the cleaner, then re-run. A hand-edited clean file is unverifiable.

### 4.2 The QA gates (what counts as data)

- **SMAP:** keep only qual flag 0 or 8 AND 0 ≤ soil moisture ≤ 0.6; average AM/PM
  per (ID, date). A missing qual-flag column defaults to 0 — that is a known
  cleaner behaviour, flag it if it ever triggers. (The spec says flag == 0 only;
  the cleaner accepts 0 and 8. The discrepancy is disclosed, not resolved — the
  spec's strict rule would pass ZERO rows in the Paw San file, since flag 0 never
  occurs. If the team tightens the gate, say so and show the count going to zero.)
- **MODIS:** keep NDVI in [−0.2, 1] with pixel_reliability 0 (good) or 1
  (marginal, flagged). Reliability 3 (cloud) is dropped. NDVI here is already
  decimal-scaled by AppEEARS — do not apply the ×0.0001 scale again.
- **IDs:** AppEEARS normalizes them (F-01 comes back as f01). The cleaner maps
  normalized IDs back to field IDs; unknown IDs pass through unmatched and never
  land in the snapshot. Township IDs (pathein, pyapon, …) return unchanged.

### 4.3 Where each series is used in the app

- **A1 Regional Coverage:** the Paw San township series. NDVI for all 7, SMAP for
  the 3 with passing retrievals; the other 4 show as no-data, with the reason
  (no QA-passing retrievals in 400 days), not as zero.
- **F3 Environmental Telemetry (fields):** the demo-fields series once §6 is
  recovered — per-field NDVI (last 24 composites) and SMAP (last 60 days) in the
  snapshot. Until then the fields stay NOT_CONNECTED, honestly.
- **Time context (past / present / future):** the pipeline's `detect_time_context`
  turns the series into dated events — dry spells (GWETROOT < 0.5, ≥7 days), wet
  spells (≥ 0.9, ≥7 days), NDVI drops (≥ 0.10). Present = the latest day plus
  stress flags. Future = the hybrid bucket-model projection, labelled a
  projection, never a forecast.
- **Kalman filter (`timeseries_hybrid.py`):** SMAP observations feed the root-zone
  wetness nowcast (r_smap 0.015). Only QA-passing retrievals enter — a failed
  retrieval is an absent observation, never a zero.
- **ML Track 2 (vegetation anomalies):** blocked until the NDVI evaluation runs.
  The NDVI data existing does not make Track 2 experimental — an evaluation run
  does. Do not change the status without one.

### 4.4 What this data must never be used for

- Never present a 9 km SMAP cell as a field measurement. It is district-scale;
  several fields share one cell. The app says so on screen.
- Never infer input prices, availability, or cash from satellite data. Those
  shocks are farmer-reported only — the F5 inputs exist precisely because the
  satellite cannot see them.
- Never present a rotation as a yield or revenue guarantee. The report screen
  carries that disclaimer for a reason.
- Never hide the farmer's existing rotation, even when the engine disqualifies it.

## 5. Deep reasoning: the five connected dots

The tool's value is not any single dataset. It is the chain, and the chain is only
as honest as its weakest link:

1. **What happened (past):** dated evidence. The POWER record gives the 2026
   monsoon wet spell (130 days, GWETROOT saturating at 1.0) and the 89-day dry
   spell before it. The NDVI drops in Feb–Mar 2026 are the harvest, dated to the
   composite. Nothing here is inferred — it is read off the series.
2. **What is happening (present — the main decision input):** the latest day. F-01
   on 2026-11-10: GWETROOT 0.71, rain_30d 144 mm (+117.9 vs the November normal),
   stress `root_zone_wet`. The present is the anchor because it is the only tense
   the farmer can act on today — the past explains it, the future is conditional
   on it.
3. **What will happen (future):** the physics projection. A bucket model with
   FAO-56 PET, dry-season rain assumed 0.0, starting mid-November, with stated
   confidence intervals. It answers one question — when does the root zone dry
   below sowing stress (0.40)? — and it says so with its assumptions on screen.
4. **What the farmer reports (constraints):** fertilizer expensive or unavailable,
   pesticide unavailable, cash tight. These are the shocks the user named, and the
   engine's Rule 9 is the only place they enter — as scenario adjustments with
   farmer-reported reasons, never as satellite detections.
5. **What to grow next (ranked rotation with reasons):** the output of the chain.
   Every candidate carries its evidence, its gaps, and its mandatory local checks.
   The existing rotation stays visible even when it loses.

Most projects show one of these dots. Showing all five, with the provenance of each
value and the gaps named, is the differentiator — and it is also the Validity
criterion the judges score. The data in this file is what makes dots 1–3 real
instead of decorative.

Two honest limits bound everything above. First, SMAP is sparse in the monsoon
window (the Oct–Nov retrievals mostly fail QA) and absent for four townships —
so the wet-season soil-moisture story is told mostly by POWER's modelled GWETROOT,
not by the satellite, and the file says that. Second, the demo-fields series is
missing (§6), so the per-field NDVI/SMAP story cannot be told yet at all — the
regional story can, and this file tells it.

## 6. Demo-fields data — what is missing and how to recover it

The task `fieldshift-demo-fields` completed on AppEEARS at 14:21:09 on 14 Nov 2026
and was then deleted from the request list before its CSVs were downloaded. The
files were never on any disk. Nothing in this file replaces them.

**Recovery path 1 — re-download (if the task still exists):** open
appeears.earthdatacloud.nasa.gov/explore, find `fieldshift-demo-fields`, click the
download button (not the trash icon) for each product, save both CSVs. Then stage
them in `data/raw/appeears/` and re-run `pipeline/clean_all.py` — the Paw San
files already staged will be read in the same run, which is the intended final
state.

**Recovery path 2 — resubmit (if the task is gone):** submit a new POINT task with
exactly this spec — name `fieldshift-demo-fields`, dates 2025-10-10 → 2026-11-14,
products MOD13Q1.061 (layers `_250m_16_days_NDVI`, `_250m_16_days_EVI`,
`_250m_16_days_pixel_reliability`) + SPL3SMP_E.006 (layers AM `soil_moisture`, PM
`soil_moisture_pm`, AM `retrieval_qual_flag`, PM `retrieval_qual_flag_pm`), points
with IDs F-01..F-06 at the fields.geojson centroids: F-01 (16.7352, 95.9548),
F-02 (16.712, 95.988), F-03 (16.7015, 95.9402), F-04 (16.6893, 95.9715), F-05
(16.7246, 95.9221), F-06 (16.6761, 95.9489). Expect ~60–75 minutes of processing
(the first run took 75). Expect returned IDs as `f01`..`f06` — the cleaner maps
them back; that fix is already in the P0 code.

**Expected shape when it lands:** MODIS ~150 rows (25 composites × 6 fields),
SMAP ~2,400 rows (400 days × 6 fields). Expect SMAP sparse in the Oct–Nov
monsoon window (the Paw San pull proves ~85–90% of retrievals fail QA there) and
richer in the dry season. Verify before integrating: rows per ID, date coverage,
IDs exactly as returned, QA-flag distribution, valid-value counts per field — the
same checks §1.3 ran on the Paw San files.

## 7. Reproduction notes

- Earthdata user: `linn21013`. AppEEARS API layer check (public product endpoint,
  no auth): SPL3SMP_E.006 layers confirmed (soil_moisture fill −9999, qual flag
  fill 65534); MOD13Q1.061 NDVI/EVI (fill −3000, scale 0.0001), pixel_reliability
  (fill −1) confirmed. The CSVs return NDVI already decimal-scaled — see §1.3.
- Raw CSVs (Paw San) are staged at `data/raw/appeears/` in the working replica
  with their AppEEARS names. The cleaning report (`data/reports/cleaning_report.json`)
  records: MODIS rows_in 175, rows_out 126, dropped 49 (cloud); SMAP rows_in 2,786,
  field_days_out 114, retrievals dropped 5,444.
- The P0 code (Rule 9 input-shock adaptation, time-context detection, AppEEARS ID
  mapping + SMAP glob fix, manifest path fix) is a separate push — see the
  Antigravity handoff. This file is data only.

---

Generated 14 Nov 2026 from the verified downloads. Paw San: complete. Demo fields:
missing — see §6. If a value in this file disagrees with a CSV, the CSV wins.