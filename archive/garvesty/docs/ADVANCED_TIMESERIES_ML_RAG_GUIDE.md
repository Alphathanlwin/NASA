# Advanced Time-Series, Physics-Guided ML & In-Situ IoT Sensor Fusion Architecture
## Master Engineering Guide for Garvesty — NASA Space Apps Challenge 2026 (Challenge 07)

---

## Executive Summary & Engineering Mission

In hackathons and real-world agricultural AI projects, **over 90% of submissions fail on scientific validity**. Teams frequently train generic deep learning models (LSTMs, XGBoost, or uncalibrated Transformers) on raw satellite feeds or attach conversational chat interfaces that hallucinate advice. The resulting systems suffer from lookahead data leakage, violate fundamental laws of thermodynamics and hydrology, confuse coarse 55 km grid cells with smallholder field plots, and produce unverified recommendations that would bankrupt a real farmer.

**Garvesty** adopts a **hybrid scientific paradigm**:
1. **Physics-Informed Water Balance Kinetics:** Enforces mass and energy conservation using FAO-56 Penman-Monteith potential evapotranspiration and Thornthwaite-Mather soil moisture recession.
2. **Conformalized Uncertainty Calibration:** Replaces fragile point forecasts with distribution-free $(1 - \alpha)$ prediction intervals that guarantee valid coverage on finite sample holdouts.
3. **State-Space Sensor Fusion:** Uses an Extended Kalman Filter (EKF) to fuse high-frequency daily meteorological telemetry (NASA POWER) with intermittent microwave (SMAP) and optical (MODIS) observations.
4. **Embedded In-Situ IoT Telemetry & Space + Ground Sensor Fusion:** Bypasses conversational chatbot gimmicks in favor of deterministic, auditable decisions fused with real-time ground-truth soil moisture and electrical conductivity probes (LoRaWAN/cellular).

---

## 1. The Top 10 Fatal Blindspots That 90% of Teams Miss in Time-Series & Geospatial ML

### Blindspot 1: Random Shuffle Leakage (Data Snooping Across Time)
* **The Error:** Applying standard scikit-learn `train_test_split(shuffle=True)` or standard $k$-fold cross-validation to sequential environmental time series.
* **Why it breaks:** Autoregressive persistence and seasonal autocorrelation allow future data points to leak into past predictions. A model achieves an artificial $R^2 > 0.95$ in validation, but collapses to near-zero accuracy when deployed on live forward telemetry.
* **Garvesty's Solution:** **Purged Walk-Forward Cross-Validation with Combinatorial Purged Holdouts (CPCV)**. We enforce a 5-day observation latency embargo and an embargo window ($t_{embargo} \ge \text{target latency}$) to prevent any temporal overlap between feature windows and forward target horizons.

### Blindspot 2: The Spatial Disaggregation Fallacy (Grid vs. Field Resolution)
* **The Error:** Treating NASA POWER (0.5° × 0.625°, ~55 km) or SMAP L4 (9 km / 36 km) grid-cell values as direct in-situ measurements of a 1-acre farmer's plot.
* **Why it breaks:** A single 55 km atmospheric grid cell covers hundreds of microclimates, topological depressions, tidal river banks, and upland terraces. Claiming field-scale precision from coarse gridded models destroys scientific credibility under expert NASA judging.
* **Garvesty's Solution:** Explicit resolution disclosures (`Footprint Disclosures` in screen F3/A2), label schemas badging coarse telemetry as `REGIONAL_GRID_ESTIMATE`, and coupling grid-scale meteorological forcings with field-scale soil texture and topography (ISRIC SoilGrids 250 m + user-annotated drainage).

### Blindspot 3: Black-Box Violations of Mass & Energy Conservation
* **The Error:** Training pure black-box neural networks (LSTM, GRU, MLP) to directly predict future soil moisture $S_{t+h}$.
* **Why it breaks:** Unconstrained neural nets readily predict negative soil moisture, moisture exceeding field capacity porosity, or moisture increases during prolonged rainless periods—violating basic conservation of mass ($dS/dt = P - ET - D$).
* **Garvesty's Solution:** **Physics-Guided Hybrid Modeling (`SoilPhysicsBucketModel`)**. The physical bucket hydrology constrains the state space. ML models are restricted to predicting the **residual error** $\epsilon_t = y_{true} - y_{physics}$, ensuring predictions can never breach thermodynamic bounds.

### Blindspot 4: The Point Forecast Illusion (Uncalibrated False Certainty)
* **The Error:** Outputting a single deterministic number (e.g. *"Root-zone moisture on Dec 15 will be 0.28"*).
* **Why it breaks:** Agricultural systems are subject to severe aleatoric uncertainty (stochastic weather volatility) and epistemic uncertainty (sparse satellite calibration). A point prediction provides zero risk awareness. If a farmer delays pulse sowing based on a false point estimate, the seed desaturates and dies.
* **Garvesty's Solution:** **Inductive Conformal Prediction (`ConformalTimeSeriesCalibrator`)**. Produces rigorous non-parametric prediction intervals $[L(x), U(x)]$ guaranteed to cover the true value at a specified confidence level (e.g. 90%) without assuming Gaussian error distributions.

### Blindspot 5: Monsoon Optical Blindness & Cloud Mask Inversion
* **The Error:** Querying optical satellite vegetation indices (MODIS / Landsat NDVI) during the monsoon season and interpreting missing or zero values as crop death.
* **Why it breaks:** Tropical delta monsoons feature continuous cloud cover for weeks. Cloud-mask algorithms flag these pixels as invalid/missing. Naive pipelines impute missing values as 0.0 or linear interpolate across month-long cloud gaps, distorting seasonal vegetative curves.
* **Garvesty's Solution:** Multi-sensor fusion via **State-Space Kalman Filtering (`ExtendedKalmanSatelliteFilter`)** combined with microwave synthetic aperture radar (SAR) and soil moisture telemetry (SMAP), which penetrate cloud decks unaffected.

### Blindspot 6: Static Crop Calendars vs. Thermal Time (Growing Degree Days)
* **The Error:** Using calendar date lookups (e.g. *"Always sow black gram on November 15"*).
* **Why it breaks:** Climate change and El Niño / La Niña oscillations shift thermal accumulation rates and monsoon withdrawal dates by up to 3 weeks. Fixed calendar dates cause crops to hit terminal heat stress during reproductive flowering.
* **Garvesty's Solution:** Accumulating physiological **Growing Degree Days (GDD)**:
  $$\text{GDD} = \sum \max\left(0, \frac{T_{max} + T_{min}}{2} - T_{base}\right)$$
  anchored to real-time NASA POWER thermal telemetry.

### Blindspot 7: The Chatbot Fallacy vs. Deterministic In-Situ IoT Support
* **The Error:** Adding an ungrounded conversational LLM chatbot that invents agronomic guidance and assumes satellite measurements provide ground-level reality.
* **Why it breaks:** Chatbots cannot be audited, fail during offline or low-connectivity conditions, and hallucinate advice. Satellites alone have a coarse footprint (9-55 km) and cannot detect micro-salinity pulses or subsurface water tables.
* **Garvesty's Solution:** Zero hallucination, deterministic rule scoring with cited scientific rationale + **Embedded In-Situ IoT Support (`app/services/iot.py`)** supporting LoRaWAN/cellular edge probes (AgroGuard) streaming real-time volumetric water content (10cm/40cm) and electrical conductivity (salinity dS/m), directly achieving Space + Ground observation fusion.

### Blindspot 8: Edaphic Neglect (Ignoring Soil Physics & Texture Kinetics)
* **The Error:** Treating all soil identically, or using only topsoil organic matter.
* **Why it breaks:** Soil water retention and drainage recession rates ($\tau$) vary by orders of magnitude between heavy delta vertic clays ($AWC \approx 180\text{ mm/m}, \tau \approx 45\text{ days}$) and sandy-loam alluvium ($AWC \approx 110\text{ mm/m}, \tau \approx 18\text{ days}$).
* **Garvesty's Solution:** Texture-dependent Available Water Capacity (AWC) parametrization and exponential recession constants integrated directly into the forward simulation loop.

### Blindspot 9: Out-of-Distribution Climate Shocks (Stationarity Fallacy)
* **The Error:** Assuming historical 30-year averages represent future seasonal probabilities.
* **Why it breaks:** Tropical systems are experiencing escalating climate anomalies (e.g., strong El Niño events causing abrupt monsoon terminations and post-monsoon heat spikes).
* **Garvesty's Solution:** Combining historical baseline climatologies (2001–2025 normals) with live 10-day trailing anomalies and What-If scenario stress-testing ($\pm 20\%$ rainfall, $+14$ days planting delay).

### Blindspot 10: Loss Function Misalignment
* **The Error:** Optimizing models exclusively for Mean Squared Error (MSE) or Mean Absolute Error (MAE).
* **Why it breaks:** In agricultural planning, an error of $+0.05$ soil moisture when conditions are wet is harmless, but an error of $+0.05$ when moisture is near the critical germination threshold ($0.35\text{ m}^3/\text{m}^3$) leads to total crop failure.
* **Garvesty's Solution:** Asymmetric loss evaluation prioritizing **critical establishment threshold crossing time** over uniform RMSE.

---

## 2. Mathematical Formulations of Garvesty's Hybrid Engine

### 2.1 Potential Evapotranspiration: Hargreaves-Samani Formulation
When complete net radiation and aerodynamic parameters are unavailable, the FAO-56 recommended Hargreaves-Samani formulation provides robust daily potential evapotranspiration ($ET_0$, mm/day) driven by solar radiation and daily temperature range:

$$ET_0 = 0.0023 \cdot \left(T_{mean} + 17.8\right) \cdot \sqrt{T_{max} - T_{min}} \cdot R_a$$

Where $R_a$ (extraterrestrial solar radiation, mm/day equivalent) is computed analytically from solar geometry:

$$R_a = \frac{24 \cdot 60}{\pi} G_{sc} d_r \left[\omega_s \sin(\phi)\sin(\delta) + \cos(\phi)\cos(\delta)\sin(\omega_s)\right] \cdot 0.408$$

- $G_{sc} = 0.0820\text{ MJ m}^{-2}\text{ min}^{-1}$ (solar constant)
- $d_r = 1 + 0.033 \cos\left(\frac{2\pi}{365} J\right)$ (inverse relative Earth-Sun distance for day $J$)
- $\delta = 0.409 \sin\left(\frac{2\pi}{365} J - 1.39\right)$ (solar declination)
- $\omega_s = \arccos\left(-\tan(\phi)\tan(\delta)\right)$ (sunset hour angle)
- $\phi = \text{latitude in radians}$

### 2.2 Soil Water Balance & Exponential Recession Kinetics
In the post-monsoon dry season, precipitation ceases ($P \approx 0$). The soil water storage ratio $S(t) \in [0, 1]$ decays according to:

$$\frac{dS}{dt} = -\frac{ET_0 \cdot K_c(t)}{AWC \cdot z_r} \cdot S(t) - D(t)$$

Under zero rainfall, this yields an exponential recession trajectory:

$$S(t) = S_0 \cdot \exp\left(-\frac{t}{\tau_{texture}}\right)$$

Where $\tau_{texture}$ is the characteristic drainage e-folding time:
- Heavy Clay (Deltavertisols): $\tau \approx 45\text{ days}$
- Clay Loam: $\tau \approx 35\text{ days}$
- Loam / Silt Loam: $\tau \approx 28\text{ days}$
- Sandy Loam: $\tau \approx 18\text{ days}$

### 2.3 Inductive Conformal Prediction Bounds
For any point estimate $\hat{y}_{t+h}$, the conformal interval at significance level $\alpha = 0.10$ (90% confidence) is defined by:

$$\Gamma_{1-\alpha}(x_{t+h}) = \left[ \hat{y}_{t+h} - q_{1-\alpha}^{(h)}, \hat{y}_{t+h} + q_{1-\alpha}^{(h)} \right]$$

Where $q_{1-\alpha}^{(h)}$ is the $\lceil (n+1)(1-\alpha) \rceil / n$ empirical quantile of non-conformity residuals $\alpha_i = |y_i - \hat{y}_i|$ evaluated on historical holdout sequences, guaranteeing finite-sample coverage:

$$P\left(Y_{t+h} \in \Gamma_{1-\alpha}(X_{t+h})\right) \ge 1 - \alpha$$

### 2.4 State-Space Extended Kalman Filtering (Sensor Fusion)
To fuse continuous modelled meteorological forcings with intermittent satellite observations:
- **State Transition:** $x_{t|t-1} = F_t x_{t-1} + B_t u_t$, with covariance $P_{t|t-1} = F_t P_{t-1} F_t^T + Q$
- **Measurement Update:** $K_t = P_{t|t-1} H_t^T \left(H_t P_{t|t-1} H_t^T + R_{sensor}\right)^{-1}$
- **State Correction:** $x_{t|t} = x_{t|t-1} + K_t \left(z_t - H_t x_{t|t-1}\right)$
- **Covariance Correction:** $P_{t|t} = (I - K_t H_t) P_{t|t-1}$

Where $R_{SMAP} \approx 0.015$ and $R_{MODIS} \approx 0.025$, allowing the system to weight each sensor according to its verified physical signal-to-noise ratio.

---

## 3. Deep Learning & Modern Time-Series Transformers Benchmark

When scaling to regional multi-year modeling, modern deep learning architectures offer distinct trade-offs:

| Architecture | Paradigm | Strengths in Agri-Remote Sensing | Vulnerabilities in Low-Data Deltas |
|---|---|---|---|
| **PatchTST (Nie et al., 2023)** | Patch-based Channel-Independent Transformer | Superior capture of long-term seasonal rhythms; sub-series patch tokenization retains local temporal semantics. | Requires $> 10^4$ temporal steps; prone to overfitting on single-station series without cross-basin transfer. |
| **Chronos (Ansari et al., 2024)** | T5-based Pre-trained Time Series Foundation Model | Pre-trained on billions of time points; zero-shot probabilistic quantile forecasting. | High inference latency; tokenizer quantization artifacts on small-magnitude environmental indices. |
| **TimesFM (Google Research, 2024)** | Decoder-only Foundation Transformer | Fast zero-shot inference; native support for arbitrary horizon lengths and covariates. | Black-box weights; lacks physical mass-conservation inductive biases. |
| **State-Space Models (Mamba / S4)** | Continuous State-Space with Selective Scan | Linear $O(N)$ computational complexity; infinite effective context window; ideal for high-frequency IoT sensor feeds. | Sensitive to hyperparameter discretization in sparse satellite passes. |
| **PINNs (Physics-Informed Neural Networks)** | Physics-Loss Regularized Deep Networks | Loss function penalizes water balance violations ($\mathcal{L} = \mathcal{L}_{MSE} + \lambda \mathcal{L}_{water\_balance}$). | Training instability; gradient pathologies between data loss and stiff differential equation loss. |
| **Garvesty Hybrid Model (Current Build)** | Analytical Physics Bucket + Conformal Residual Calibration | Zero data requirement to maintain physical bounds; deterministic; zero-latency; 100% auditable. | Does not model non-linear high-order regional teleconnections (e.g. Pacific PDO interactions). |

---

## 4. In-Situ IoT Software Architecture & Space + Ground Fusion

```
┌───────────────────────────────────────┐             ┌───────────────────────────────────────┐
│ NASA Earth Observation & Reanalysis   │             │ In-Situ AgroGuard IoT Edge Nodes      │
│ - NASA POWER (0.5° MERRA-2 T2M, Rain) │             │ - LoRaWAN / Cellular Sub-Ghz Mesh     │
│ - SMAP L4 (9 km Root-Zone Moisture)   │             │ - Dual-depth Capacitive VWC (10cm/40cm)│
│ - MODIS / VIIRS Regional Vegetation   │             │ - Electrical Conductivity (EC dS/m)   │
└──────────────────┬────────────────────┘             └──────────────────┬────────────────────┘
                   │                                                     │
                   │                                                     │
                   └──────────────────────────┬──────────────────────────┘
                                              │
                              ┌───────────────▼───────────────┐
                              │ Extended Kalman Filter (EKF)  │
                              │ State-Space Observation Fusion│
                              └───────────────┬───────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │                                               │
                      ▼                                               ▼
    ┌───────────────────────────────────┐           ┌───────────────────────────────────┐
    │ Dynamic Ground-Truth Correction   │           │ Agronomic Threshold Alarms        │
    │ - Overrides 55 km footprint bias  │           │ - Salinity Spike (EC >= 2.0 dS/m) │
    │ - Fuses 40cm root VWC directly    │           │ - Critical Drought (< 25% VWC)    │
    │ - Provenance: GROUND_TRUTH        │           │ - Ponding / Waterlogging (> 45%)  │
    └─────────────────┬─────────────────┘           └─────────────────┬─────────────────┘
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              │
                              ┌───────────────▼───────────────┐
                              │ Deterministic Decision Engine │
                              │ (Unified /api/analysis)       │
                              └───────────────────────────────┘
```

### Telemetry Packet Specification & Hardware Ingestion
Every registered in-situ field sensor (e.g. `AgroGuard LoRaWAN Probe v2` deployed in Twante Pilot Fields `F-01` and `F-02`) reports the following schema:
- `device_id`: Canonical hardware identifier (e.g. `GW-TW01`).
- `field_id`: Assigned field polygon.
- `soil_moisture_10cm_vwc`: Topsoil volumetric water content (0.0 to 1.0).
- `soil_moisture_40cm_vwc`: Root-zone volumetric water content (0.0 to 1.0).
- `soil_temp_c`: In-situ probe thermal reading (5.0 to 50.0 °C).
- `salinity_ec_ds_m`: Pore-water electrical conductivity (0.0 to 15.0 dS/m) measuring tidal brackish water intrusion.
- `battery_mv`: Node lithium battery voltage (2500 to 4500 mV).
- `rssi_dbm`: LoRaWAN radio packet signal strength (-130 to -30 dBm).

---

## 5. Summary of Implementation in Garvesty Codebase

1. **Hydrological Time-Series Engine**: [backend/app/engine/timeseries_hybrid.py](file:///C:/Users/ASUS/Downloads/NASA/backend/app/engine/timeseries_hybrid.py)
   - Implements `SoilPhysicsBucketModel` (Hargreaves-Samani PET and exponential recession).
   - Implements `ConformalTimeSeriesCalibrator` (distribution-free quantile coverage).
   - Implements `ExtendedKalmanSatelliteFilter` (sensor fusion).
   - Implements `predict_rootzone_recession` (28-day forward trajectory generator).
2. **In-Situ IoT Software & Gateway Service**: [backend/app/services/iot.py](file:///C:/Users/ASUS/Downloads/NASA/backend/app/services/iot.py)
   - Edge probe device registry (`GW-TW01`, `GW-TW02`).
   - Ingests LoRaWAN / Cellular telemetry packets with physical validation.
   - Computes real-time agronomic threshold alerts (salinity intrusion $\ge 2.0\text{ dS/m}$, root drought $< 0.25\text{ VWC}$).
3. **Unified Analysis Service Integration**: [backend/app/services/analysis.py](file:///C:/Users/ASUS/Downloads/NASA/backend/app/services/analysis.py)
   - Automatically computes `hydrological_trajectory` on valid regional coordinates.
   - Synchronizes in-situ ground-truth telemetry into the unified decision pipeline.
4. **FastAPI Endpoints**: [backend/app/api.py](file:///C:/Users/ASUS/Downloads/NASA/backend/app/api.py)
   - `GET /api/timeseries/hybrid-nowcast`: On-demand 28-day conformal recession trajectory.
   - `GET /api/iot/devices`: List registered in-situ field sensor nodes.
   - `GET /api/fields/{field_id}/iot`: Real-time telemetry, alerts, and battery status.
   - `POST /api/fields/{field_id}/iot`: Ingest new edge node telemetry packet.
5. **Interactive UI Integration**: [frontend/src/components/FarmerViews.tsx](file:///C:/Users/ASUS/Downloads/NASA/frontend/src/components/FarmerViews.tsx) & [frontend/src/components/AnalystViews.tsx](file:///C:/Users/ASUS/Downloads/NASA/frontend/src/components/AnalystViews.tsx)
   - Screen F3: Displays in-situ probe metrics, Space + Ground fusion badge, and active threshold alarms.
   - Screen A1: Mission Overview displays the AgroGuard LoRaWAN edge sensor mesh table.
   - Screen A2: Field Intelligence provides space-versus-ground comparative telemetry analysis.
6. **Automated Verification**: [backend/tests/test_timeseries_hybrid.py](file:///C:/Users/ASUS/Downloads/NASA/backend/tests/test_timeseries_hybrid.py)
   - 7 unit and integration tests verifying physical bounds, conformal coverage, Kalman filtering, IoT ingestion, and alert generation.
