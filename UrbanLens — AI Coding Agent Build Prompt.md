# UrbanLens — Build Prompt for an AI Coding Agent

> This is a complete, self-contained specification. Do not ask clarifying questions unless a hard blocker is hit — make a reasonable decision, note it in `DECISIONS.md`, and keep moving.

---

## 0. TL;DR Mission

Build **UrbanLens**: a geospatial AI/ML web application that detects urban heat-island hotspots, explains what is driving them, forecasts near-future heat stress, and optimizes cooling interventions — with IoT sensor ground-truth integration.

**The context that matters:** this is a final-year B.Tech IT major project being demoed to college faculty. The presentation is **tomorrow**. Therefore:

- A **working, beautiful, end-to-end prototype** beats a technically purist but half-broken system.
- The app must **run from a single command with zero external accounts, zero API keys, zero cloud setup, and zero internet dependency after `pip install` / `npm install`**.
- Real satellite/ERA5 downloads (GEE, CDS) must exist **as pluggable adapters**, but must NOT be on the critical path. The default data path is a **physically-grounded synthetic city generator**.
- Every synthetic data source must be **visibly labelled as synthetic in the UI** (a small badge/tooltip), so nothing is ever passed off as real measurement. See §11 (Research Integrity).

---

## 1. Non-Negotiable Constraints

| Constraint | Rule |
|---|---|
| Time | Working prototype in a single long agent session. Prioritise ruthlessly using the P0/P1/P2 table in §12. |
| Offline-first | No API keys, no sign-ups, no paid services, no Docker required. `npm run dev` + `uvicorn` must be enough. |
| Install safety | Heavy/optional ML deps (PyTorch) must be **optional extras**. The app must fully run on `numpy + pandas + scikit-learn + fastapi` only. |
| No fake interactivity | Every button, slider, chart, and map layer must be wired to real computation. No dead controls, no `TODO` stubs in the UI path. |
| Determinism | Synthetic data generation must be seeded so results are reproducible across runs and between demo attempts. |
| Fast startup | Backend cold start < 10s. Precompute model weights and result artifacts once; cache to disk (`.artifacts/`), load on boot. |
| Single source of truth | All backend artifacts land in `backend/.artifacts/*.json` so the frontend can run even if a recompute is skipped. |

---

## 2. Product Definition

### 2.1 The problem being solved
Urban Heat Islands (UHIs) raise city temperatures 3–10 °C above rural surroundings, driving energy demand, health risk and climate vulnerability. Existing monitoring relies on sparse weather stations and manual analysis — too slow and too coarse to guide intervention. UrbanLens fuses satellite imagery, reanalysis meteorology, urban morphology and live IoT readings into one pipeline that (a) finds hotspots, (b) explains the drivers, (c) forecasts heat stress, and (d) solves for the most cost-effective cooling interventions per zone.

### 2.2 Study area
**Mumbai, India.** Default bounding box roughly `lat 18.90–19.20`, `lon 72.78–73.00` (covers Andheri → Dadar → Kurla corridor). Study-area focus: **Andheri–Kurla** corridor. Make bbox + grid resolution configurable in one config file.

### 2.3 The four user-facing questions the demo must answer
1. **Where is it hottest?** → Interactive heat-stress map + ranked hotspot table.
2. **Why?** → SHAP driver-attribution panel, per zone and city-wide.
3. **What happens next?** → 48-hour forecast chart with confidence band.
4. **What should we do about it?** → NSGA-II intervention optimizer with Pareto front + budget slider.

---

## 3. System Architecture (4 Layers)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          UrbanLens Pipeline                                │
├──────────────┬──────────────┬──────────────┬────────────────────────────────┤
│  LAYER 1     │  LAYER 2     │  LAYER 3     │  LAYER 4                      │
│  Data Ingest │  Processing  │  AI/ML Core  │  Outputs & Dashboard           │
├──────────────┼──────────────┼──────────────┼────────────────────────────────┤
│ Landsat 8    │ LST extract  │ U-Net CNN    │ Heat Stress Map                │
│ Sentinel-2   │ NDVI/NDBI    │ PINN         │ Driver Importance (SHAP)       │
│ ERA5 Met     │ MNDWI/LULC   │ Bi-LSTM      │ 48h Heat Forecast              │
│ OSM / GHSL   │ SVF / morpho │ NSGA-II      │ Intervention Scenarios         │
│ IoT Sensors  │ 30m gridding │ SHAP XAI     │ Live IoT Feed                  │
│ (ESP32+DHT11)│ Bias correct │              │ PDF / GeoJSON / CSV Export     │
└──────────────┴──────────────┴──────────────┴────────────────────────────────┘
```

Data flow: **Ingest → Align → Engineer features → Train models → Serve artifacts → Render dashboard → IoT stream in.**

---

## 4. Technology Stack (make these exact choices)

### 4.1 Backend — Python 3.11+
- `fastapi`, `uvicorn[standard]` — REST API + static artifact serving
- `pydantic` v2 — request/response schemas
- `numpy`, `pandas` — array + tabular work
- `scikit-learn` — gradient boosting, RF, MLP, preprocessing, metrics
- `shap` — XAI attribution (has a fast `TreeExplainer`; use it, not `DeepExplainer`)
- `pymoo` — NSGA-II multi-objective optimizer
- `rasterio`, `geopandas`, `shapely`, `pyproj` — GeoTIFF/vector IO, CRS handling, rasterization (used by the real-data adapters and the GeoTIFF export)
- `joblib` — model serialization
- `requests` — HTTP client for the optional real-data adapters only
- `reportlab` — PDF report export
- **Optional extras** (`requirements-heavy.txt`, not required to run): `torch`, `segmentation-models-pytorch` for the real U-Net/Bi-LSTM training path

### 4.3 Frontend — the showcase surface. This must look excellent.
- `Vite` + `React 18` + `TypeScript`
- `tailwindcss` (v3) + `postcss` + `autoprefixer`
- `framer-motion` — all entrance/exit/number/hover animation
- `maplibre-gl` — map rendering (no Mapbox token; use free raster style or a bare style with OSM raster tiles)
- `recharts` — charts
- `zustand` — lightweight global state
- `react-router-dom` — page routing
- `lucide-react` — icon set
- `clsx` + `tailwind-merge` — class composition helper

### 4.4 Do NOT use
Streamlit (looks generic — replace it with the React dashboard, keep Streamlit only as an optional notebook-export path), Jupyter as the app surface, any API-key-gated map provider, any UI kit that imposes a generic look (no Material UI, no Bootstrap, no shadcn default theme without heavy restyling).

---

## 5. Repository Structure

Create exactly this layout:

```
urbanlens/
├── README.md                     # quickstart, demo script, architecture, honest limitations
├── DECISIONS.md                  # every shortcut/assumption you made + why
├── LICENSE
├── .env.example
├── Makefile                      # `make setup`, `make dev`, `make artifacts`, `make reset`
├── docker-compose.yml            # optional convenience only; app must work without it
│
├── backend/
│   ├── requirements.txt          # core (guaranteed installable)
│   ├── requirements-heavy.txt    # torch etc. (optional)
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py               # FastAPI app factory, CORS, router mounting
│   │   ├── config.py             # pydantic-settings: bbox, grid size, paths, DEMO_MODE
│   │   ├── schemas.py            # all Pydantic models
│   │   ├── api/
│   │   │   ├── heatmap.py
│   │   │   ├── drivers.py
│   │   │   ├── forecast.py
│   │   │   ├── interventions.py
│   │   │   ├── iot.py
│   │   │   ├── meta.py           # health, model versions, data provenance
│   │   │   └── export.py
│   │   └── core/
│   │       ├── grid.py           # geospatial grid: bbox → affine transform, lon/lat↔cell
│   │       ├── io_artifacts.py   # read/write .artifacts/*.json with caching
│   │       └── logging.py
│   ├── pipeline/
│   │   ├── stage1_ingest/
│   │   │   ├── synthetic_city.py     # ★ seeded generator: LST, NDVI, NDBI, MNDWI, SVF, ERA5
│   │   │   ├── landsat.py            # optional real adapter (GEE/USGS) - flagged
│   │   │   ├── sentinel2.py          # optional real adapter (GEE/Copernicus) - flagged
│   │   │   ├── era5.py               # optional real adapter (CDS) - flagged
│   │   │   ├── osm_morphology.py     # real OSM via osmnx/geopandas + synthetic fallback
│   │   │   └── registry.py           # source selection logic driven by DEMO_MODE
│   │   ├── stage2_features/
│   │   │   ├── indices.py            # NDVI, NDBI, MNDWI, impervious %, albedo
│   │   │   ├── morphology.py         # building density, mean height, SVF approximation, canyon
│   │   │   ├── stack.py              # assemble H×W×F stack, normalize, persist as npz/GeoTIFF
│   │   │   └── bias_correction.py    # ERA5 delta-correction vs IoT ground truth (linear regression)
│   │   ├── stage3_models/
│   │   │   ├── heat_classifier.py    # ★ P0: pixel-level 4-class heat stress model
│   │   │   ├── unet.py               # P1: PyTorch U-Net (optional dep) + numpy fallback note
│   │   │   ├── pinn.py               # ★ P0: energy-balance-constrained numpy MLP
│   │   │   ├── forecaster.py         # ★ P0: lag-feature sequence model + Bi-LSTM (P1)
│   │   │   ├── shap_drivers.py       # ★ P0: SHAP TreeExplainer driver attribution
│   │   │   └── registry.py           # model registry: name, version, path, metrics
│   │   ├── stage4_optimizer/
│   │   │   ├── interventions.py      # intervention catalogue with literature-grounded parameters
│   │   │   ├── nsga2_problem.py      # pymoo Problem definition
│   │   │   └── scenarios.py          # run + cache Pareto fronts per zone
│   │   └── build_artifacts.py       # one-shot orchestrator → .artifacts/
│   ├── iot/
│   │   ├── esp32_firmware.py        # MicroPython sketch (ESP32 + DHT11 + LDR → MQTT)
│   │   ├── esp32_simulator.py       # ★ P0: publishes realistic readings to same topic
│   │   ├── mqtt_subscriber.py       # paho-mqtt → SQLite + broadcast to API clients
│   │   └── store.py                 # SQLite schema, queries, retention
│   ├── exports/
│   │   ├── pdf_report.py            # ReportLab report generator
│   │   └── geotiff.py               # rasterio GeoTIFF writer w/ CRS + tags
│   └── tests/
│       ├── test_grid.py
│       ├── test_interventions.py
│       ├── test_optimizer.py
│       ├── test_api_smoke.py
│       └── test_artifact_schema.py
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js          # ★ design tokens live here
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── index.html                  # preconnect fonts, meta, theme-color, no-FOUC script
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                 # router + layout shell
│       ├── styles/index.css        # Tailwind layers, custom utilities, keyframes
│       ├── lib/
│       │   ├── api.ts              # typed fetch client + generated-style types
│       │   ├── format.ts
│       │   ├── cn.ts
│       │   └── constants.ts        # heat classes, colors, feature names, interventions
│       ├── store/
│       │   ├── appStore.ts
│       │   └── selectionStore.ts
│       ├── components/
│       │   ├── layout/  (Sidebar, TopBar, PageShell, CommandHint)
│       │   ├── ui/      (GlassCard, GradientButton, StatTile, Badge, Tooltip, Skeleton,
│       │   │              Toggle, Slider, Select, Tabs, Modal, Toast, ProgressBar)
│       │   ├── map/     (HeatMap, MapLegend, MapControls, ZonePopup, LayerSwitch,
│       │   │              BuildingExtrusions, ScanlineOverlay)
│       │   ├── charts/  (AttributionBar, ForecastChart, ParetoScatter, ResidualChart,
│       │   │              ComparisonChart, ChartTooltip)
│       │   ├── sensors/ (LiveGauge, Sparkline, SensorCard, StatusPulse)
│       │   └── sections/(HeroBand, MetricStrip, PipelineFlow, ModuleCard)
│       └── pages/
│           ├── Overview.tsx         # landing / KPI band / pipeline diagram
│           ├── HeatMap.tsx          # ★ the map experience
│           ├── Drivers.tsx          # SHAP attribution
│           ├── Forecast.tsx         # 48h forecast
│           ├── Optimizer.tsx        # NSGA-II scenarios + Pareto
│           ├── Sensors.tsx          # IoT live feed
│           └── About.tsx            # architecture, provenance, limitations, export
│
├── data/
│   ├── raw/         (.gitkeep)
│   ├── iot/         readings.db, readings.csv
│   └── notes/       DATA_SOURCES.md
│
├── notebooks/       (thin wrappers that call the pipeline — not the source of truth)
└── scripts/
    ├── dev.py       # one-command launcher (backend + frontend + iot simulator)
    └── seed_demo.py
```

---

## 6. Data Layer — Detailed Spec

### 6.1 `DEMO_MODE` switch
`config.py` exposes `DEMO_MODE: bool = True`. When true, every data source resolves through a synthetic adapter that is **also tagged `synthetic=True`** in provenance metadata. When false, real adapters activate (and may fail gracefully back to synthetic with a logged warning + provenance flag flip). The API always returns provenance; the UI always shows it.

### 6.2 Synthetic city generator (`synthetic_city.py`) — this is the heart of the demo, make it convincing
Seed = `42`. Target grid default `240 × 240` cells at ~30 m over the Mumbai bbox (make resolution configurable; also support a `120×120` "fast" preset).

Generate a 10-channel stack, each with **plausible spatial structure** — not white noise. Concretely:

1. **Coastline / land mask** — Mumbai's west-facing Arabian Sea coastline. Build it from a parametric curve (spline through hand-picked lon/lat coastal control points) so water bodies read correctly on the map.
2. **Urban density field** — smooth fractal noise (sum of octaves of smoothed random field) biased to peak along the Andheri–Bandra–Dadar–Kurla corridor.
3. **Building footprint layer** — vector polygons (rectangles/quads) generated along the road grid: high-density blocks in Andheri East / Dadar / Kurla, medium in Bandra, low in Santacruz, near-zero on the island fringe. Include height attribute (3 m to 45 m, heavy-tailed). This layer feeds both the map's 3D extrusion and the morphology features.
4. **Road network** — synthetic polylines between district centroids, used for canyon/sky-view computation and as a map overlay.
5. **Green space patches** — polygon blobs with inverted vegetation signal (parks: Hiranandani Gardens, Powai, Sanjay Gandhi National Park edge, Maidan).
6. **Water bodies** — the ocean + a few inland tanks.
7. **Derived per-cell channels:**
   - `LST` (°C) — driven by `(1 − NDVI)`, impervious %, low SVF (canyon trapping), low wind, low humidity, plus a diurnal + seasonal offset. Realistic Mumbai range ≈ 29–52 °C surface temp.
   - `NDVI ∈ [−0.2, 0.85]`
   - `NDBI ∈ [−0.5, 0.6]`
   - `MNDWI ∈ [−1, 1]`
   - `impervious_pct ∈ [0, 100]`
   - `building_density ∈ [0, 1]`
   - `mean_height_m ∈ [0, 45]`
   - `svf ∈ [0.3, 1.0]` (sky view factor; lower = denser canyons)
   - `era5_temp`, `era5_humidity`, `era5_wind`, `net_radiation` — smooth regional fields with plausible diurnal cycles.

Validation: the generator must produce a spatial pattern where the hottest pixels cluster in dense, low-SVF, low-NDVI, high-NDBI areas. Add a self-check assertion in `build_artifacts.py` that prints the correlation matrix of the key channels so the developer can eyeball it in the console. This correlation sanity-check is what makes the demo intellectually honest.

### 6.3 Time series
Generate a 30-day hourly series per **sentinel zone** (aggregate the grid into ~12 named zones: Andheri East, Andheri West, Bandra, Santacruz, Powai, Goregaon, Dadar, Mahim, Sion, Wadala, Chembur, Kurla) — 720 timesteps × 12 zones × ~8 variables. Include:
- diurnal cycle (peak ~14:00–16:00 IST, trough ~05:00 IST)
- a synthetic "heat wave" event window (3 consecutive hot days) so the forecast demo has something dramatic to show
- mild AR(1) noise for realism

### 6.4 Real-data adapters (implement, but keep them thin and optional)
Each adapter: a documented function with the exact API call sequence (GEE `ee.ImageCollection` filter for Landsat 8 `LANDSAT/LC08/C02/T1_L2` band `ST_B10`; Sentinel-2 `COPERNICUS/S2_SR_HARMONIZED` bands B8/B4/B11; ERA5 via `cdsapi` variable `2m_temperature`; OSM via `geopandas.read_file` of an Overpass query or `osmnx`). Wrap in `try/except` → on failure, fall back to synthetic, log the error, set provenance `synthetic=True, reason="<error>"`. Include a `--source` CLI flag on `build_artifacts.py`.

### 6.5 Derived geospatial outputs
- `heat_stress_map`: `H×W` int array with classes `0=Low, 1=Moderate, 2=High, 3=Extreme`; store as `uint8 .npy` plus a base64 PNG for instant frontend display plus a GeoJSON of hotspot polygons.
- `zone_summary`: per zone — mean/max LST, area km² per class, population proxy, dominant LULC, top-3 drivers.
- Exportable as **GeoTIFF** (EPSG:4326, 30 m, band tags with class legend) and **CSV**.

---

## 7. AI/ML Layer — Detailed Spec

Keep the **mathematically real** and the **computationally light**. Every model must report honest evaluation metrics on a held-out split.

### 7.1 P0 — Heat Stress Classifier (stands in for the U-Net stage)
`sklearn.ensemble.HistGradientBoostingClassifier` (fast, strong, SHAP-compatible via `TreeExplainer`) on a pixel-level dataset sampled from the feature stack. Multi-class: Low / Moderate / High / Extreme, labels derived from **percentile thresholds on the LST distribution** (document the exact percentile cutoffs). Cap training samples at ~150 k rows for speed.

Report: per-class precision/recall/F1, macro IoU (Jaccard), overall accuracy, confusion matrix. Persist the confusion matrix to artifacts — the frontend renders it.

Also implement a **spatial generalization test**: train on the northern half of the grid, evaluate on the southern half. Report the delta. This is a genuinely impressive, cheap result for a viva.

### 7.2 P1 — Real U-Net (optional extra)
`segmentation_models_pytorch.Unet(encoder_name='resnet34', in_channels=F, classes=4)` on 64×64 patches, loss = categorical cross-entropy + Dice. Implemented in `unet.py`, gated behind availability of torch. Patch extraction, flip/rotate augmentation, 80/20 spatial split, ~50 epochs, report mean IoU + Dice. If torch is absent, `registry.py` registers the sklearn classifier under the name `heatmap-model` and the UI shows the active architecture honestly. **Do not let torch absence break anything.**

### 7.3 P0 — Physics-Informed Neural Network (`pinn.py`) — real, in pure NumPy
Implement a small MLP (2 hidden layers, 64 units, tanh) predicting the three surface-energy-balance fluxes `H` (sensible), `LE` (latent), `G` (soil heat flux) from the physical drivers. Write forward pass, backprop, and Adam **by hand in NumPy** (~150 lines). Loss:

```
L = MSE(H, H_obs) + MSE(LE, LE_obs) + MSE(G, G_obs) + λ_phys · mean((H + LE + G − Rn)²)
```

Run the same MLP **without** the physics term as an ablation baseline. Report:
- mean energy-balance residual (W/m²) for both models
- RMSE on an out-of-distribution test set (unseen NDVI/albedo regime)

Deliver the headline comparison chart: *"Physics-informed constraint reduces OOD error by X%"*. This is the single most convincing slide in the whole project — make sure it works.

### 7.4 P0 — Forecaster (`forecaster.py`)
Two implementations behind one interface:
- **Primary (guaranteed):** `sklearn` model over a lag-feature matrix. For each horizon `h ∈ {6, 12, 24, 48}` hours, build `[t-1..t-24]` lags of LST, humidity, wind, NDVI, hour-of-day sin/cos, day-of-week → predict `T+h` heat stress index. Use `MLPRegressor` or `HistGradientBoostingRegressor`. Report RMSE, MAE, bias, and skill score vs a persistence baseline.
- **P1 (torch):** Bi-LSTM `(30, 7) → 4 horizons` in `unet.py`-style optional module.

Produce a `forecast` artifact per zone with a **mean line and a prediction-interval band** (from quantile regressors or residual std). The band is what makes the chart look credible.

### 7.5 P0 — SHAP Driver Attribution (`shap_drivers.py`)
`shap.TreeExplainer` on the heat classifier, over a stratified background sample (~2 k rows, keep it fast). Produce:
- `global_importance`: mean |SHAP| per feature, all 10 channels, with sign
- `zone_importance`: same, computed per zone subset — this is the per-zone driver panel
- `beeswarm` data and a waterfall example for the single hottest pixel

Expose the top-3 drivers per zone as text sentences, e.g. *"Kurla's heat stress is driven primarily by high built-up intensity (NDBI), low vegetation (NDVI) and low sky-view factor."* The UI shows these as generated insight cards. Evaluators love this.

### 7.6 NSGA-II Intervention Optimizer (`stage4_optimizer/`)
**Intervention catalogue** — each with `cooling_effect_c`, `cost_per_m2`, `co_benefit_score` (0–1, composite of biodiversity / stormwater / aesthetics), `applicable_zone_types`, `citation`:

| Intervention | ΔLST effect | Relative cost | Co-benefit |
|---|---|---|---|
| Urban tree canopy +10% | −1.2 to −2.5 °C | high | 0.95 |
| Cool/white roofs (albedo 0.6) | −1.5 to −3.0 °C | medium | 0.40 |
| Green roofs (sedum) | −0.8 to −1.8 °C | medium | 0.85 |
| Permeable pavements | −0.5 to −1.0 °C | low | 0.60 |
| Water bodies / blue-green | −1.0 to −2.0 °C | very high | 0.90 |

**Problem definition:** decision vector = intervention intensity `x ∈ [0,1]^5` per zone, optionally with a budget constraint `cost(x) ≤ B`. Objectives: minimize post-intervention LST, minimize cost, maximize co-benefit. Use `pymoo` `NSGA2` with SBX + polynomial mutation, pop size 100, ~150 generations. Cache the Pareto front per zone.

Additionally produce a **recommended plan** per zone: pick a knee-point solution (min distance to the utopia point) as "recommended", plus **low / medium / high budget** presets. Aggregate a city-wide plan with total cost in ₹ crore and total cooling in °C and km² covered.

### 7.7 Model registry & artifact manifest
Every model writes `models/registry.json`: name, version, class, library+version, training date, train/val split description, metrics, feature list, artifact paths. The UI's About page renders this table from `/api/meta/models` — evaluators love a self-documenting metrics table.

---

## 8. Backend API Contract

All endpoints under `/api`, JSON in/out, CORS allow `http://localhost:5173`.

```
GET  /api/health
GET  /api/meta/provenance      # per-source: synthetic|real, timestamp, resolution, license, citation
GET  /api/meta/models          # model registry + metrics
GET  /api/meta/zones           # zone list: id, name, bounds, centroid, area_km2, population_proxy

GET  /api/heatmap?layer=heat_stress|lst|ndvi|ndbi|svf|impervious|drivers
      -> { image_png_b64, width, height, bbox, classes:[...], legend:[...], stats:{min,max,mean}, hotspots:[{id,name,class,lat,lon,area_km2,peak_lst,top_drivers[]}] }
GET  /api/heatmap/zones/{zone_id}          # zone detail incl. per-class area breakdown
GET  /api/heatmap/toggle/{class_id}        # masked polygon GeoJSON for a stress class

GET  /api/drivers/global                   # global mean|SHAP| + beeswarm payload
GET  /api/drivers/zone/{zone_id}           # per-zone attribution + insight sentence
GET  /api/drivers/correlations             # feature correlation matrix

GET  /api/forecast?zone_id=&horizon=all    # per-zone horizon series + PI band + metrics
GET  /api/forecast/citywide                 # city aggregate curve

GET  /api/interventions/catalogue          # intervention table
POST /api/interventions/optimize           # {zone_id, budget, weights:{cooling,cost,cobenefit}}
                                          # -> {pareto:[...], recommended:{...}, presets:{low,medium,high}}
GET  /api/interventions/plan?budget=       # city-wide aggregated plan (₹ crore, °C, km²)

GET  /api/iot/latest                       # {node_id, ts, temp_c, humidity_pct, lux_proxy, battery?, rssi?, status}
GET  /api/iot/history?hours=24&node_id=    # time series for sparkline
GET  /api/iot/stream                       # SSE stream of readings (this powers the live UI)
GET  /api/iot/validation                   # sensor vs ERA5 vs satellite-LST comparison + bias stats

GET  /api/pinn/metrics                     # physics residual, ablation comparison, OOD error
POST /api/export/report.pdf                # -> PDF bytes
GET  /api/export/heatmap.geojson
GET  /api/export/heatmap.geotiff
GET  /api/export/summary.csv
```

Use **SSE** (`text/event-stream`) for the IoT stream — simpler than WebSockets, works through everything, auto-reconnects in the browser. Push a reading every 5 seconds in demo mode (accelerated from the real 5-minute cadence, with a UI note explaining the time-lapse).

---

## 9. IoT Layer — Detailed Spec

### 9.1 ESP32 firmware (`esp32_firmware.py`)
MicroPython, ESP32 + **DHT11** (pin 4) + **LDR** (ADC). Connects to WiFi, publishes JSON to `urbanlens/node1` on the configured MQTT broker every 300 s: `{"node_id","ts","temp_c","humidity_pct","lux_proxy","rssi"}`. Include reconnect/backoff logic, and clear comments about pinout, power supply, and how to flash (`esptool` + MicroPython firmware). Include a hardware BOM table in `DATA_SOURCES.md`.

### 9.2 MQTT subscriber (`mqtt_subscriber.py`)
`paho-mqtt` client subscribing to `urbanlens/#`; writes each reading to SQLite (`readings` table: `node_id, ts, temp_c, humidity_pct, lux_proxy, rssi`) and publishes to an in-process async queue that the FastAPI SSE endpoint drains. Runs as a background asyncio task inside the API process (simplest) **and** as a standalone script.

### 9.3 Simulator (`esp32_simulator.py`) — the demo-day safety net
Generates physically consistent readings: diurnal temperature curve anchored to the model's forecast for the node's zone, humidity inversely correlated with temperature plus noise, LDR following the solar elevation curve. Replayable and deterministic. **If no real MQTT broker is reachable, the API transparently falls back to the simulator and reports `mode: "simulated"` in `/api/iot/latest`.** This is non-negotiable — the demo must never show an empty sensor panel.

### 9.4 Ground-truth usage
Compute and expose the **ERA5 bias correction**: linear regression of sensor temp vs nearest ERA5 grid cell over the available window → slope + intercept + R². Show "before/after correction" values in the UI. Also compare satellite LST at the node pixel vs sensor air temp and discuss the LST-vs-air-temperature distinction honestly (this is a classic viva question — pre-empt it in the About page).

---

## 10. Frontend — Design & Experience Spec (read carefully, this is what wins the demo)

### 10.1 Design language
**"Mission-control geospatial analytics"** — dark, dense, confident, alive. Think Linear/Vercel/ArcGIS Pro blended. It must look like a funded product, not a student dashboard.

**Palette (define as Tailwind tokens in `tailwind.config.js`):**
- Background: near-black with a blue undertone — `#070A12`, panels `#0D1220` / `#111827`
- Borders: `#1E293B` at 60–80% opacity; subtle 1px hairlines
- Text: `#E2E8F0` primary, `#94A3B8` muted, `#475569` faint
- **Thermal accent ramp (the signature visual identity, used everywhere)** — Low `#3B82F6` → Moderate `#22D3EE` → High `#F59E0B` → Extreme `#EF4444`. Use it for map legend, chips, chart series, status dots, gradient borders.
- Secondary accents: emerald `#10B981` (interventions/savings), violet `#8B5CF6` (ML/models), cyan `#06B6D4` (IoT/live)
- Gradients: `from-[#F59E0B] to-[#EF4444]` for hero/CTA; subtle radial glow behind the hero

**Typography:** Inter (UI, via Google Fonts) + JetBrains Mono (numbers, code, IDs). Tabular-nums for all metric figures. Tight letter-spacing on headings (`-0.02em`), generous line-height on body.

**Texture:** faint dot-grid or noise overlay on the background at 3–4% opacity; a subtle radial vignette. Restrained — it should be felt, not seen.

### 10.2 Motion (framer-motion) — use everywhere, tastefully
- **Page/route transitions:** fade + 12px rise, 250 ms, `cubic-bezier(0.16, 1, 0.3, 1)`
- **Staggered lists:** cards enter with 40 ms stagger
- **Count-up numbers:** all KPI tiles animate 0→value over 900 ms with easing
- **Hover:** cards lift `-2px` + border brightens to the accent at 40% + a soft glow
- **Live IoT:** pulsing ring on the status dot, continuous 2 s loop; sparkline path draws itself in via `pathLength`
- **Heat map:** an animated scanline sweeps the map once on load; legend chips stagger in
- **Buttons:** magnetic-ish scale `0.98` on press, shimmer sweep on primary CTA
- **Skeleton loaders** shaped like the real content, never spinners
- **Layout:** `prefers-reduced-motion` respected globally

### 10.3 Layout shell
- **Fixed left sidebar** (72 px collapsed / 248 px expanded): logo mark (custom inline SVG — a lens/aperture over a heat gradient), nav items with icons + labels + active indicator that animates between items (`layoutId` in framer-motion), and a bottom "System Status" block (API health, model versions, data mode) with real pulsing dots.
- **Top bar**: page title + breadcrumb, global zone selector, date/time of analysis, `DEMO` badge when synthetic, export menu.
- **Content area**: max-width none, generous padding, 12-column responsive grid. Section headers use an eyebrow label (uppercase, letterspaced, muted) + large title + one-line description.
- **Command hint** (`?` key): a small overlay listing keyboard shortcuts. Cheap to build, feels professional.

### 10.4 Pages

**① Overview (landing)**
- Full-bleed hero: eyebrow `SJCEM · B.Tech IT · Final Year Major Project`, huge gradient headline *"See the heat. Understand it. Cool it."*, one-paragraph subtitle, two CTAs (`Explore Heat Map`, `Run Scenario`), and a live KPI strip beneath.
- Animated **pipeline diagram**: the 4-layer architecture as a horizontal flow with glowing nodes that "flow" on animation, hoverable to reveal what each stage does. Reuse this diagram's style on the About page.
- Four module cards (Data Fusion / Physics-Informed ML / Intervention Optimizer / IoT Integration) with icons, gradient top-borders, and micro-sparklines.
- KPI strip: mean city LST, hotspot area km², hottest zone, predicted 48h peak, IoT live reading, citywide max achievable ΔT.
- **City context row:** small multiples — LST, NDVI, NDBI, SVF rendered as small raster thumbnails (reuse the heatmap renderer at low res).

**② Heat Map (the centrepiece)**
- Full-height MapLibre map filling the content area, dark basemap (CARTO dark_matter raster tiles — free, no key).
- Overlays, toggleable via a floating control panel:
  - `Heat Stress Classes` — the 4-class raster as a MapLibre **image source** (client-rendered from a base64 PNG or generated on a canvas) with opacity slider
  - `LST Continuous` — same pipeline with a thermal colour ramp
  - `Vegetation (NDVI)` / `Built-up (NDBI)` / `Sky View Factor` / `Impervious %` / `Building Density`
  - `3D Buildings` — `fill-extrusion` layer from the building footprint GeoJSON, height from the `mean_height_m` attribute, coloured by thermal class; toggleable, with pitch/bearing animation when switched on
  - `Roads`, `Green Space`, `Water`
  - `IoT Node` — a pulsing marker at the deployed node's coordinates
- **Left/right floating panel:** layer switcher (icon buttons, tooltips), legend (gradient bar + class swatches + threshold °C values), opacity control, and a **hotspot ranking list** — sorted by peak LST, each row showing rank, zone name, class chip, ΔT, area. Hovering a row highlights its polygon on the map and vice-versa (two-way binding).
- **Click a zone** → slide-in detail drawer: mini class-breakdown donut, top-3 drivers, area stats, buttons to jump to Drivers / Optimizer for that zone.
- **Cross-fade** between layers (250 ms), not a hard swap. Smooth zoom-to-zone on row click (`map.flyTo`).
- A **compare mode**: pin the current layer, switch to another, and blend A/B with a slider. Impressive and cheap.

**③ Drivers (SHAP)**
- Hero stat: "**NDBI** is the #1 driver of urban heat in the study area, contributing X% of total attribution."
- Global attribution: horizontal bar chart of mean |SHAP| per feature, coloured by whether the feature increases or decreases heat (use the thermal ramp), with value labels and a toggle between `mean|SHAP|` and `sum|SHAP|`.
- **Zone selector** → per-zone bar chart + an auto-generated insight sentence in a glass card.
- **Beeswarm plot** (SHAP summary) rendered in Recharts (each dot = one pixel, jittered).
- **Waterfall chart** for the single hottest pixel: base value → each feature's contribution → final prediction. This is the "explain one prediction" money shot — style it beautifully.
- Correlation heatmap matrix (feature × feature, diverging palette) with hover tooltips.
- Fraction-of-attribution donut: "vegetation deficit accounts for 34% of heat stress variance".

**④ Forecast**
- Multi-line chart: city mean + hottest zone, hourly, past 30 days compressed into context + next 48 h emphasised, with a **prediction-interval ribbon** and a vertical "now" marker.
- Horizon cards for `+6h / +12h / +24h / +48h`: predicted temp, change vs now, confidence, RMSE.
- Small multiples per zone (12 sparklines) in a grid; hover to enlarge.
- A clearly-marked **heat-wave event window** shaded on the chart with an annotation callout.
- Model metrics panel: RMSE, MAE, bias vs ERA5, persistence-baseline skill score, with a "vs baseline" delta badge.

**⑤ Optimizer (NSGA-II)**
- Zone selector + three budget presets (Low ₹2 Cr / Medium ₹8 Cr / High ₹20 Cr) as segmented control, plus a custom budget slider.
- **Pareto front scatter** — x = cost, y = cooling achieved, point size = co-benefit, coloured by recommended knee-point highlighted with a ring and label. Hover shows the intervention mix for that solution. Animate points in as they "evolve".
- **Recommendation card:** knee-point solution — intervention mix as stacked bars with per-intervention ΔT contribution, total cost, total cooling, co-benefit score, and a one-paragraph generated recommendation ("For Kurla, prioritising cool roofs and permeable pavements delivers 2.8 °C reduction at ₹6.2 Cr — 41% cheaper than the max-cooling solution for only 0.6 °C less benefit.").
- **What-if slider panel:** drag intervention intensities manually → live recomputed ΔT and cost, plus a marker on the Pareto plot showing where the manual mix lands.
- **Before/after visualisation:** toggle the map between current heat stress and post-intervention heat stress with a slider wipe.
- City-wide plan summary: total cost (₹ crore), total cooling (°C), area treated (km²), zone-by-zone allocation table.

**⑥ Sensors (IoT live)**
- Big live gauge card: current temperature with an animated arc gauge (thermal ramp), humidity, LDR/light proxy, RSSI, node uptime, last-seen.
- 24-hour sparkline with a moving live point.
- **Live status strip** at top: pulsing `LIVE` badge, broker mode (`simulated` / `real MQTT`), messages received counter incrementing in real time, samples/hour.
- **Validation panel** — the scientific heart: satellite LST vs sensor air temp vs ERA5 reanalysis for the node's pixel, with a scatter + 1:1 line, bias, MAE, R², and the bias-correction before/after comparison. Add a short honest explainer that LST ≠ air temperature.
- Hardware card: ESP32 + DHT11 + LDR photo, BOM table with ₹ costs, wiring diagram (inline SVG), and the honest framing sentence: *"A single node is deployed as a proof-of-concept demonstrating real-time ground-truth integration; a scaled 5–10 node deployment is recommended for production."*

**⑦ About**
- System architecture diagram (rendered nicely, not ASCII).
- Data provenance table: every source, whether synthetic or real, resolution, licence, citation.
- Model registry table with all metrics.
- Limitations & future work — write this yourself, honestly. It reads as maturity and pre-empts evaluator questions.
- Export centre: PDF report, GeoJSON, GeoTIFF, CSV.
- Footer: team members placeholder, guide/sign-off placeholders, tech-stack chips.

### 10.5 UI primitives to build (`components/ui/`)
`GlassCard` (bg blur + border + optional gradient top-border + hover lift), `GradientButton`, `StatTile` (label, count-up value, unit, delta badge, sparkline slot, icon), `Badge` (variants: default / thermal / live / warn / ok), `Tooltip`, `Skeleton`, `Toggle`, `Slider` (custom-styled range), `SegmentedControl`, `Select`, `Tabs`, `Drawer` (slide-in), `Modal`, `Toast` notifications, `ProgressBar`, `EmptyState`, `DataProvenanceTag`.

### 10.6 Performance & polish checklist
- Raster PNGs fetched once and cached in memory; map layers toggle instantly
- All charts inside memoized components; heavy map work off the render path
- Skeletons for every async surface; no layout shift on load
- Fully responsive: 1440 / 1280 / 768 / 390 px. Sidebar collapses to icons < 1024 px, bottom nav < 768 px
- Tabular-nums on all metrics; consistent number formatting (°C to 1 dp, ₹ in Cr/lakh, km² to 2 dp)
- Keyboard accessible: focus rings, Esc closes drawers/modals, arrow keys navigate the hotspot list
- Page titles + favicon; no console errors

---

## 11. Research Integrity (important — keep the user out of trouble)

1. Every synthetic source is tagged in `provenance` and rendered as a `SYNTHETIC / DEMO DATA` badge in the UI. Never hide it.
2. README and About page contain an explicit **"Prototype status"** section: what is real, what is simulated, what is stubbed behind an optional dependency.
3. Intervention effect ranges are labelled with literature references in `interventions.py` (include a `citation` field; use plausible published ranges).
4. Never claim the LST classifier is a trained satellite model when it is not. The About page names the *active* architecture, whatever it resolved to.
5. Provide a `DEMO_SCRIPT.md` — a 6-minute verbal walkthrough an evaluator can follow, and a `VIVA_QA.md` with ~20 likely examiner questions and honest answers (e.g. "Why 30 m resolution?", "Why PINN and not plain regression?", "How would you scale to 50 nodes?", "What are PINN's failure modes?", "Why NSGA-II over a weighted-sum scalarisation?").

---

## 12. Build Order & Priorities

Work strictly in this order. If time runs short, **P0 must be complete and polished; P1 and P2 may be stubbed with an honest "coming next" state — but never with a broken control.**

| Pri | Item | Est. |
|---|---|---|
| **P0-1** | Repo scaffold, config, dependency install verified, `Makefile`, `scripts/dev.py` | 30 m |
| **P0-2** | `grid.py` + `synthetic_city.py` (the 10-channel stack) + self-check correlations | 90 m |
| **P0-3** | `stack.py` zone aggregation + heat classifier + metrics + `build_artifacts.py` | 60 m |
| **P0-4** | FastAPI endpoints + artifacts to JSON/base64 | 45 m |
| **P0-5** | Frontend scaffold, Tailwind tokens, design system primitives, layout shell | 60 m |
| **P0-6** | Heat Map page fully working (the centrepiece) | 90 m |
| **P0-7** | SHAP drivers + `pinn.py` (numpy PINN + ablation) | 75 m |
| **P0-8** | Optimizer: catalogue + pymoo NSGA-II + Pareto | 60 m |
| **P0-9** | Forecaster + IoT simulator + SSE live feed | 60 m |
| **P0-10** | Overview page, About page, exports (PDF/GeoJSON/CSV/GeoTIFF) | 60 m |
| **P0-11** | End-to-end polish pass, responsive check, README, DEMO_SCRIPT, VIVA_QA | 60 m |
| **P1** | Real U-Net (torch extra), Bi-LSTM, real-data adapters, MAP comparison mode, Before/After map wipe, command palette | as time allows |
| **P2** | GeoTIFF visual preview, notebook wrappers, Docker, Streamlit export path | if time |

**Rule:** before starting P1, verify the P0 build runs end to end. Commit-ready at every P0 milestone.

---

## 13. Acceptance Criteria

The build is done when **all** of these pass:

```bash
make setup      # installs backend core deps + frontend deps, no errors
make artifacts  # regenerates all artifacts from scratch, < 3 min on laptop
make dev        # one command: backend + frontend + IoT simulator
```

- [ ] Frontend loads with zero console errors; `npm run build` succeeds
- [ ] `GET /api/health` returns `ok`; all endpoints return 200
- [ ] Heat map renders the 4-class layer with legend, and layer toggles cross-fade
- [ ] Hotspot list ↔ map highlight is two-way; zone drawer opens and navigates
- [ ] 3D building extrusion toggles on with animated pitch
- [ ] SHAP global bar chart, beeswarm, waterfall, and correlation matrix all render real data
- [ ] Forecast chart shows mean + prediction band + horizon cards + metrics
- [ ] Pareto scatter renders, presets work, manual what-if slider recomputes live
- [ ] IoT panel updates live via SSE with a visibly incrementing counter
- [ ] Physics-vs-no-physics comparison chart renders with a real computed improvement number
- [ ] All four export formats download successfully
- [ ] App is fully functional with the network cable unplugged after install
- [ ] Resize to 768 px and 390 px — layout holds
- [ ] Keyboard: `Esc`, `Tab`, arrow keys behave; focus visible
- [ ] `README.md`, `DECISIONS.md`, `DEMO_SCRIPT.md`, `VIVA_QA.md`, `DATA_SOURCES.md` all written
- [ ] `pytest backend/tests` green

---

## 14. Deliverables Checklist

```
[ ] Git repo initialised with meaningful commit history (one commit per P0 milestone)
[ ] README.md — setup, run, architecture, prototype status, limitations
[ ] DECISIONS.md — every shortcut and assumption
[ ] DEMO_SCRIPT.md — 6-minute walkthrough
[ ] VIVA_QA.md — likely questions + honest answers
[ ] DATA_SOURCES.md — provenance + hardware BOM + citations
[ ] .env.example — every configurable knob documented
[ ] backend/.artifacts/ regenerable from scratch
[ ] frontend production build
[ ] Screenshots of all 7 pages (the student will need these for the PPT)
```

---

## 15. Working Style for the Agent

1. **Build, don't plan.** Scaffold and get something rendering, then iterate. Never spend more than a few minutes on architecture discussion.
2. **Verify installs immediately.** After `pip install` / `npm install`, run a smoke test before writing more code. Catch dependency hell early.
3. **One milestone at a time**, each ending in a runnable state. Never leave the app broken between milestones.
4. **Cache aggressively.** Compute once into `.artifacts/`, serve many times. No endpoint should recompute a model at request time.
5. **No placeholder UI.** If a page isn't ready, don't render a broken one — hide the nav item or show a tasteful "in progress" state.
6. **Prefer real numbers over round numbers.** If a metric comes out as `0.8471`, show `0.8471`. Fake round metrics are the fastest way to lose an examiner's trust.
7. **Match the existing conventions** of any code already in the repo before writing new code.
8. **Report honestly at the end**: what works, what is simulated, what is stubbed, what to fix first.

---

## 16. One-Line Reminder

> Ship a **visually spectacular, numerically honest, fully offline** prototype of a four-stage geospatial AI pipeline — data fusion, physics-informed ML, multi-objective intervention optimization, and live IoT ground truth — with a modern dark mission-control React dashboard on top of a FastAPI backend, synthetic-but-plausible Mumbai geospatial data standing in for satellite downloads, and real SHAP / PINN / NSGA-II / forecasting math underneath.