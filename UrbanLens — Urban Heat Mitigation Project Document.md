Final Year Major Project · B.Tech IT · SJCEM Mumbai

# UrbanLens

Geospatial AI/ML system for urban heat stress detection, driver analysis, and physics-informed cooling intervention optimization — with IoT ground-truth integration.

Urban Heat Islands PINN · U-Net · LSTM IoT Sensor Network Geospatial AI NSGA-II Optimizer Landsat 8 · Sentinel-2

## 1. Project Overview

UrbanLens addresses a critical problem: **Urban Heat Islands (UHIs)** raise city temperatures 3–10°C above rural surroundings, increasing energy demand, mortality risk, and climate vulnerability. Standard monitoring relies on sparse weather stations and manual analysis — too slow and too coarse to guide policy.

This project builds an end-to-end AI/ML pipeline that fuses **satellite imagery, ERA5 meteorological data, OpenStreetMap urban morphology,** and **real-time IoT sensor readings** to (a) detect heat hotspots, (b) explain what's driving them, and (c) simulate which cooling interventions reduce heat stress most efficiently.

🛰️

#### Data Fusion

Satellite LST + ERA5 weather + OSM morphology + live IoT sensors merged into a unified geospatial dataset.

🧠

#### Physics-Informed ML

PINN encodes energy balance physics; U-Net generates spatial heat maps; Bi-LSTM forecasts temporal heat stress.

🌿

#### Intervention Optimizer

NSGA-II multi-objective optimizer selects best cooling interventions per zone (green roofs, trees, albedo changes, water bodies).

📡

#### IoT Integration

ESP32 + DHT22/DS18B20 nodes collect ground-truth temperature and humidity for model calibration and bias correction.

## 2. System Architecture

┌─────────────────────────────────────────────────────────────────────┐ │ UrbanLens Pipeline │ ├──────────────┬──────────────┬──────────────┬───────────────────────────┤ │ LAYER 1 │ LAYER 2 │ LAYER 3 │ LAYER 4 │ │ Data Ingest │ Processing │ AI/ML Core │ Outputs & Dashboard │ ├──────────────┼──────────────┼──────────────┼───────────────────────────┤ │ Landsat 8 │ LST Extract │ PINN │ Heat Stress Map │ │ Sentinel-2 │ NDVI/NDBI │ U-Net CNN │ Driver Importance Map │ │ ERA5 Met │ LULC Segment │ Bi-LSTM │ 48h Heat Forecast │ │ OSM / GHSL │ Morpho Feat. │ NSGA-II │ Intervention Scenarios │ │ IoT Sensors │ MQTT Broker │ SHAP XAI │ Streamlit Web Dashboard │ │ (ESP32+DHT22)│ Bias Correct │ │ PDF/GeoTIFF Export │ └──────────────┴──────────────┴──────────────┴───────────────────────────┘

## 3. Module Breakdown

### Module 1 — Data Collection & IoT Layer

**Satellite Data (Free, no sign-up cost):**

- **Landsat 8 Band 10** → Land Surface Temperature (LST) via USGS EarthExplorer or Google Earth Engine (GEE)
- **Sentinel-2 RGB + NIR** → LULC segmentation, NDVI, NDBI via Copernicus Open Access Hub
- **ERA5** → Air temp, humidity, wind — download via CDS API (free Python library)
- **OpenStreetMap** → Buildings, roads, green spaces via `osmnx` Python library

**IoT Hardware (₹200–500 budget — single proof-of-concept node):**

| Component | Purpose | Approx. Cost | Where to Buy |
| --- | --- | --- | --- |
| ESP32 Dev Board (×1) | Microcontroller + WiFi | ₹180–250 | Robu.in / local |
| DHT11 Sensor | Air temp + humidity (±2°C) | ₹40–60 | Robu.in / local |
| LDR Module | Solar irradiance proxy | ₹20–30 | Any electronics shop |
| Jumper wires + breadboard | Connections (no soldering) | ₹40–60 | Any electronics shop |
| **Total** |  | **\~₹280–400** |  |

**Budget reality:** ₹200–500 = 1 ESP32 node only. DHT11 replaces DHT22 (cheaper; ±2°C accuracy is acceptable for a demo). No Raspberry Pi — run MQTT broker (Mosquitto) free on your laptop. Frame this as a "single proof-of-concept node demonstrating real-time ground-truth integration" — that's honest and sufficient for evaluation.

**Simple Setup:** Flash ESP32 with MicroPython. Node reads sensors every 5 min → publishes to HiveMQ cloud free tier (no local broker needed). Python subscriber on your PC logs to CSV/SQLite and feeds the dashboard.

\# ESP32 MicroPython — sensor publish (simplified) import dht, machine, network, time from umqtt.simple import MQTTClient sensor = dht.DHT11(machine.Pin(4)) def publish(): sensor.measure() temp = sensor.temperature() hum = sensor.humidity() client.publish(b"urbanlens/node1", f"{temp},{hum}") # Runs every 5 minutes while True: publish() time.sleep(300)

### Module 2 — Geospatial Preprocessing

All data sources are reprojected to a common CRS (EPSG:4326), clipped to the study area (e.g., Mumbai city bounds), and resampled to a uniform 30m grid using `rasterio` and `geopandas`.

rasterio geopandas osmnx shapely earthengine-api xarray numpy

**Feature Engineering:**

- **LST** — from Landsat Band 10 using emissivity correction
- **NDVI** = (NIR − Red) / (NIR + Red) → vegetation density
- **NDBI** = (SWIR − NIR) / (SWIR + NIR) → built-up intensity
- **MNDWI** → water body extent
- **Sky View Factor (SVF)** — from DSM using `WhiteboxTools` or approximated from OSM building heights
- **Impervious Surface %** — from LULC segmentation
- **ERA5 bias-corrected with IoT readings** using linear regression delta correction

### Module 3 — AI/ML Core

#### 3a. U-Net CNN — Heat Stress Map Generation

U-Net takes a multi-channel raster stack (LST, NDVI, NDBI, MNDWI, SVF, building density, ERA5 vars) as input and outputs a pixel-wise heat stress classification map (Low / Moderate / High / Extreme).

- Input: **H × W × 9 feature stack** (patch-based: 64×64 tiles)
- Output: Segmentation mask (4-class heat stress zone)
- Training: 80/20 split; labels from historical LST thresholds
- Loss: Categorical cross-entropy + Dice loss

**Why U-Net?** It's the standard architecture for remote sensing segmentation, has pre-built PyTorch implementations, and handles small training sets well with skip connections.

#### 3b. Physics-Informed Neural Network (PINN)

Standard ML ignores physical constraints — PINNs embed the **Urban Energy Balance equation** directly into the loss function:

\# PINN Loss = Data Loss + Physics Residual Loss # Energy Balance: Rn = H + LE + G # Rn = net radiation, H = sensible heat, LE = latent heat, G = soil heat flux def physics_loss(pred_H, pred_LE, pred_G, Rn): residual = pred_H + pred_LE + pred_G - Rn return torch.mean(residual \*\* 2) # penalizes energy imbalance total_loss = data_loss + lambda_phys * physics_loss(...)

This ensures predictions don't violate physical laws — critical for credibility in a competition/college submission.

#### 3c. Bidirectional LSTM — Temporal Heat Forecasting

Uses 30-day historical sequences of LST + ERA5 variables per grid cell to forecast heat stress for the next 48 hours. Bi-LSTM captures both forward (trend) and backward (seasonal) temporal patterns.

- Input sequence: `[T-30d ... T] → (30, 7 features)`
- Output: Heat stress index for T+6h, T+12h, T+24h, T+48h

#### 3d. SHAP — Driver Analysis (XAI)

SHAP (SHapley Additive exPlanations) quantifies which features most influence heat stress predictions in each zone. This directly fulfills the *"Quantify drivers of urban heating"* objective with interpretable outputs.

import shap explainer = shap.DeepExplainer(unet_model, background_data) shap_values = explainer.shap_values(test_tiles) shap.summary_plot(shap_values, feature_names=\['LST','NDVI','NDBI','SVF','Wind','Humidity','Albedo','LULC','IoT_Temp'\])

### Module 4 — Cooling Intervention Optimizer

Using NSGA-II (multi-objective genetic algorithm from `pymoo`), the optimizer finds the best combination of interventions per heat zone, balancing:

- 🎯 **Minimize:** Estimated post-intervention LST (°C)
- 💰 **Minimize:** Implementation cost (normalized)
- 🌱 **Maximize:** Co-benefit score (biodiversity, stormwater, aesthetics)

| Intervention | Modeled Effect | Applicable Zone |
| --- | --- | --- |
| Urban tree canopy (+10%) | −1.2 to −2.5°C LST | High-density residential |
| Cool/white roofs (albedo 0.6) | −1.5 to −3.0°C roof LST | Commercial/industrial |
| Green roofs (sedum) | −0.8 to −1.8°C | Flat-roof buildings |
| Permeable pavements | −0.5 to −1.0°C | Roads/parking |
| Water bodies / blue-green | −1.0 to −2.0°C | Open/park zones |

\# NSGA-II setup with pymoo from pymoo.algorithms.moo.nsga2 import NSGA2 from pymoo.core.problem import Problem class HeatMitigationProblem(Problem): def \_evaluate(self, X, out, \*args, \*\*kwargs): # X = intervention mix per zone (continuous 0–1) delta_LST = compute_lst_reduction(X) cost = compute_cost(X) out\["F"\] = np.column_stack(\[-delta_LST, cost\]) # minimize both

### Module 5 — Dashboard (Streamlit)

A simple interactive web app to present results to evaluators without needing GIS software.

- 📍 **Folium map** — overlays heat stress zones (color-coded) on city basemap
- 📊 **SHAP bar charts** — driver importance per selected zone
- 🌿 **Scenario panel** — pick interventions, see predicted ΔT in real time
- 📡 **IoT live feed** — shows sensor readings updating every 5 min
- 📥 **Export** — download GeoTIFF heat maps + PDF report

streamlit run app.py # Hosted locally or deployed on Streamlit Community Cloud (free)

## 4. Technology Stack

#### Data & Geospatial

Google Earth Engine rasterio geopandas osmnx xarray GDAL cdsapi (ERA5)

#### AI / ML

PyTorch segmentation_models_pytorch scikit-learn shap pymoo (NSGA-II) deepxde (PINN)

#### IoT & Networking

MicroPython (ESP32) MQTT (Mosquitto) paho-mqtt SQLite HiveMQ Cloud

#### Visualization & Deployment

Streamlit Folium Plotly Matplotlib ReportLab (PDF)

## 5. Implementation Phases (12 Weeks)

1

Data Collection & IoT Setup

Weeks 1–2 · Easy

- Register on Google Earth Engine (student account, free)
- Download Landsat 8, Sentinel-2 scenes for study area (Mumbai / chosen city)
- Set up CDS API for ERA5 download (free, one-time registration)
- Flash ESP32 nodes with MicroPython, test DHT22 readings
- Set up MQTT broker (Mosquitto on laptop or HiveMQ free cloud)
- Collect 1 week of IoT sensor data to validate setup

2

Geospatial Feature Engineering

Weeks 3–4 · Easy–Medium

- Extract LST from Landsat Band 10 using emissivity correction
- Compute NDVI, NDBI, MNDWI from Sentinel-2
- Fetch OSM building footprints using `osmnx`, compute building density and height
- Reproject and co-register all layers to 30m grid using rasterio
- Perform bias correction of ERA5 temperature using IoT ground-truth delta correction
- Stack all features into numpy arrays → save as GeoTIFF

3

U-Net Heat Stress Map Training

Weeks 5–6 · Medium

- Label heat stress classes using percentile thresholds on historical LST
- Patch the raster stack into 64×64 tiles; augment (flip, rotate)
- Use `segmentation_models_pytorch` pre-built U-Net with ResNet34 encoder
- Train on Google Colab (free T4 GPU) — typically converges in \~50 epochs
- Evaluate with IoU / Dice score
- Reconstruct full-city heat stress map from predictions

4

PINN Energy Balance Model

Weeks 7–8 · Medium

- Use `deepxde` or vanilla PyTorch PINN implementation
- Define energy balance PDE as custom loss term
- Train on pixel-wise feature data to predict sensible heat flux (H)
- Compare PINN vs plain regression — show physics reduces out-of-distribution error
- Use ERA5 net radiation estimates as Rn ground truth

5

Bi-LSTM Forecast + SHAP Analysis

Week 9 · Easy

- Prepare time-series dataset from multi-temporal LST + ERA5 sequences
- Train Bi-LSTM in PyTorch — standard sequence-to-sequence setup
- Evaluate RMSE on held-out dates
- Run SHAP on trained U-Net / gradient boosting baseline to rank drivers
- Generate bar charts of feature importance per heat zone

6

Intervention Optimizer + Dashboard

Weeks 10–11 · Medium

- Define intervention effectiveness from literature (parameterized)
- Implement NSGA-II problem in `pymoo` — takes \~1 hour to code
- Run optimization for each heat zone; generate Pareto front of tradeoffs
- Build Streamlit dashboard: folium map, SHAP charts, scenario panel, IoT live feed
- Deploy on Streamlit Community Cloud (free)

7

Testing, Report & Presentation

Week 12 · Easy

- Validate predictions against held-out IoT sensor readings
- Document all results with maps, tables, and metrics
- Prepare project report following college format
- Demo: live IoT → MQTT → dashboard flow for evaluators

## 6. Repository Structure

urbanlens/ ├── # Data collection ├── data/ │ ├── raw/ # Downloaded GeoTIFFs (Landsat, Sentinel-2, ERA5) │ ├── processed/ # Co-registered, feature-engineered layers │ └── iot/ # Sensor readings (CSV / SQLite) │ ├── iot/ │ ├── esp32_firmware.py # MicroPython sketch │ └── mqtt_subscriber.py # Python MQTT listener + DB writer │ ├── notebooks/ │ ├── 01_data_collection.ipynb │ ├── 02_feature_engineering.ipynb │ ├── 03_unet_training.ipynb │ ├── 04_pinn_model.ipynb │ ├── 05_lstm_forecast.ipynb │ ├── 06_shap_analysis.ipynb │ └── 07_intervention_optimizer.ipynb │ ├── models/ │ ├── unet/ # Saved weights │ ├── pinn/ │ └── lstm/ │ ├── app/ │ ├── app.py # Streamlit dashboard │ └── utils.py │ └── requirements.txt

## 7. Datasets & Access

| Dataset | Source | Access | Free? |
| --- | --- | --- | --- |
| Landsat 8 LST | USGS / Google Earth Engine | GEE Python API or EarthExplorer | ✅ Yes |
| Sentinel-2 LULC | Copernicus / GEE | GEE or Open Access Hub | ✅ Yes |
| ERA5 Meteorological | ECMWF / CDS | `cdsapi` Python library | ✅ Yes |
| OpenStreetMap | OpenStreetMap | `osmnx` Python library | ✅ Yes |
| GHSL Urban Form | EC Joint Research Centre | Direct download (GeoTIFF) | ✅ Yes |
| IoT Ground Truth | Your own ESP32 nodes | MQTT → local CSV | ✅ Yes |

**GEE Tip:** Apply for a Google Earth Engine non-commercial/student account at `earthengine.google.com`. Approval takes 1–3 days. All satellite data is free and preprocessed.

## 8. Evaluation Metrics

#### Heat Map Accuracy

- U-Net IoU score per class
- LST RMSE (°C) vs IoT ground truth
- Overall classification accuracy

#### PINN Physics Residual

- Energy balance residual (W/m²)
- Comparison to non-physics baseline
- Generalization to unseen dates

#### Forecast Quality

- LSTM RMSE and MAE (°C)
- 48h forecast skill score
- Bias vs ERA5 reference

#### Intervention Optimizer

- Max ΔT reduction achievable (°C)
- Pareto front diversity
- Spatial coverage per budget tier

## 9. IoT Integration Detail

The IoT component serves two purposes: (1) fulfills the college hardware requirement, and (2) provides real-world ground-truth to validate and bias-correct satellite-derived LST estimates.

### Deployment Plan (Single Node — ₹280–400 budget)

- **Node placement:** Place in the most heat-stressed zone identified by the U-Net map (e.g., dense concrete/road area near college) — this makes the IoT reading directly relevant to your hotspot findings
- **Data logged:** Air temperature (°C), relative humidity (%), light intensity (LDR proxy for solar load)
- **Communication:** ESP32 → WiFi → HiveMQ cloud MQTT (free) → Python subscriber → SQLite on your laptop
- **Use in pipeline:** Single-point ground-truth comparison against nearest ERA5 grid cell and satellite LST pixel — frame as "point validation" not spatial interpolation (honest given 1 node)
- **Report framing:** "A single IoT node was deployed as a proof-of-concept to demonstrate real-time ground-truth integration. A scaled deployment of 5–10 nodes is recommended for production use."

**For demo day:** Show evaluators the live Streamlit panel with IoT readings updating in real-time. This is the most impressive visual and requires no extra code beyond the MQTT subscriber already in the pipeline.

## 10. Project Deliverables

| Deliverable | Format | Competition Objective Covered |
| --- | --- | --- |
| Heat Stress Maps (multi-date) | GeoTIFF + Folium web map | Identify Urban Heat Hotspots |
| SHAP Driver Importance Report | PDF + interactive charts | Analyze Drivers of Urban Heating |
| PINN + U-Net Validation Metrics | Jupyter notebook + tables | Model Heat Dynamics using AIML |
| Scenario Intervention Report | PDF + optimizer Pareto plot | Generate & Optimize Cooling Scenarios |
| Streamlit Dashboard | Web app (hosted) | All objectives |
| IoT Sensor Dataset | CSV + SQLite | College hardware requirement |
| GitHub Repository | Public repo | Reproducibility |

## Shortcuts & Simplifications

- 🔧 Use `segmentation_models_pytorch` — one line to get a pretrained U-Net, no architecture coding from scratch
- 🌍 Use GEE's built-in LST product instead of computing from raw bands manually (saves a week)
- ⚡ For PINN, start with `deepxde` library — it handles the physics loss boilerplate
- 📊 For SHAP, run it on a **gradient boosted model** (XGBoost) first as baseline — much faster to train than U-Net and still valid for feature importance
- 🗺️ Restrict study area to a single district (e.g., Andheri or Kurla in Mumbai) — easier to collect IoT data there too
- 💸 Total hardware budget: \~₹280–400 for 1 ESP32 + DHT11 + LDR node (single proof-of-concept)
- ☁️ All compute on Google Colab free tier is sufficient — no paid GPU needed

UrbanLens · Final Year Major Project · B.Tech IT · SJCEM, University of Mumbai · 2026–2027