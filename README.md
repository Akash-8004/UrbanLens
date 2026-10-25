# UrbanLens

A geospatial AI prototype for urban heat. It detects heat islands, explains what drives them (SHAP), forecasts heat 48 hours ahead, recommends cooling interventions (NSGA-II), and checks results against IoT ground truth. It runs fully offline on a seeded synthetic model of Mumbai's Western Line corridor, from South Mumbai to Palghar.

**SJCEM · B.Tech IT · Final Year Major Project**

---

## Contents

- [Requirements](#requirements)
- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [Prototype status](#prototype-status)
- [Architecture](#architecture)
- [Project layout](#project-layout)
- [API overview](#api-overview)
- [Dashboard pages](#dashboard-pages)
- [Common tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Further docs](#further-docs)

---

## Requirements

| Tool | Version |
|---|---|
| Python | 3.11 or newer |
| Node.js | 18 or newer (with npm) |
| make | Optional. On Windows, use the commands written out below. |

---

## Quickstart

```bash
# 1. Optional: copy the default config
cp .env.example .env

# 2. Backend dependencies
python -m pip install -r backend/requirements.txt

# 3. Build model artifacts (run once; takes about 1–3 min)
cd backend
python -m pipeline.build_artifacts
cd ..

# 4. Frontend dependencies
cd frontend
npm install
cd ..
```

Then start the app in **two terminals**:

```bash
# Terminal A: API + IoT simulator
python scripts/dev.py
# (or: cd backend && uvicorn app.main:app --reload --port 8000)

# Terminal B: dashboard
cd frontend
npm run dev
```

| URL | What |
|---|---|
| http://localhost:5173 | Dashboard (Vite dev server, sends `/api` to port 8000) |
| http://localhost:8000/docs | Interactive API docs (Swagger) |
| http://localhost:8000/api/health | Health check |

> The ESP32 sensor simulator starts automatically with the API, so you don't need a separate process for the Sensors page.

### Optional heavy extras

To use the real U-Net and Bi-LSTM, raster/vector I/O and MQTT:

```bash
python -m pip install -r backend/requirements-heavy.txt
```

This adds `torch`, `segmentation-models-pytorch`, `rasterio`, `geopandas` and `paho-mqtt`. Without these packages, the affected parts fall back to stubs and the app still runs.

---

## Configuration

Settings come from `.env` in the repo root (see [backend/app/config.py](backend/app/config.py)). All of them have defaults, so `.env` is optional.

| Variable | Default | Purpose |
|---|---|---|
| `DEMO_MODE` | `true` | Use the synthetic city (currently always used) |
| `SEED` | `42` | Seed for the synthetic city; same seed gives the same city |
| `GRID_H` / `GRID_W` | `140` / `100` | Raster grid size (~340 × 770 m cells over this bbox) |
| `BBOX_MIN_LAT` … `BBOX_MAX_LON` | `18.88, 19.85, 72.70, 73.02` | Study area bounding box |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
| `MQTT_HOST` / `MQTT_PORT` | `localhost` / `1883` | Broker for the optional MQTT ingest |

After changing `SEED`, the grid or the bbox, rebuild the artifacts (`make reset && make artifacts`).

---

## Prototype status

This table shows what is real and what is simulated.

| Layer | What runs | Status |
|---|---|---|
| Data | Seeded synthetic Mumbai corridor (140×100 grid, ~2900 km² land) | **Synthetic / demo** |
| Heat map | `HistGradientBoostingClassifier` (4 classes from LST percentiles) | Real sklearn model |
| U-Net / Bi-LSTM | Optional `torch` extras | Stubbed if torch is absent |
| PINN | Pure-NumPy MLP + energy-balance residual | Real ablation metrics |
| SHAP | `TreeExplainer` on the classifier | Real attributions |
| Forecast | Lag-feature regressor with prediction-interval bands | Real sklearn model |
| Optimizer | pymoo NSGA-II, knee-point plans | Real multi-objective optimisation |
| IoT | Real ESP32 + DHT11 via USB serial or WiFi → SSE stream | **Real hardware**, simulator fallback |
| Satellite adapters | Landsat / Sentinel-2 / ERA5 / OSM modules | Stubs; fall back to synthetic |

The API tags every synthetic source in its provenance data, and the UI labels it **SYNTHETIC / DEMO DATA**.

---

## Architecture

```
 Stage 1 Ingest      Stage 2 Features       Stage 3 Models            Stage 4 Optimizer
 ───────────────     ─────────────────      ──────────────────        ─────────────────
 synthetic city  ──► NDVI / NDBI / MNDWI ─► heat classifier      ──►  intervention catalogue
 (+ real adapter     morphology (SVF, …)    PINN · forecaster         NSGA-II scenarios
  stubs)             bias correction        SHAP drivers · U-Net
                     stacked channels
                                   │
                                   ▼
                    backend/.artifacts/  (JSON, PNG layers, GeoJSON)
                                   │
                                   ▼
             FastAPI (/api/*)  ──►  React + MapLibre dashboard
                   ▲
          ESP32 simulator / MQTT
```

`python -m pipeline.build_artifacts` runs all four stages once and writes the results to `backend/.artifacts/`. The API only serves those precomputed files and never retrains on a request. The one exception is `/api/interventions/optimize`, which runs NSGA-II on demand.

---

## Project layout

```
backend/
  app/            FastAPI app: config, routers (api/), core helpers, schemas
  pipeline/       stage1_ingest → stage2_features → stage3_models → stage4_optimizer
                  build_artifacts.py — one-shot builder
  iot/            ESP32 simulator, MicroPython firmware, MQTT subscriber, SQLite store
  exports/        PDF report and GeoTIFF writers
  tests/          pytest suite
frontend/
  src/pages/      Overview, HeatMap, Drivers, Forecast, Optimizer, Sensors, About
  src/components/ map, charts, sensors, layout, ui
  src/lib/api.ts  API client
  src/store/      zustand stores
scripts/          dev.py (run API), seed_demo.py (build artifacts)
data/             raw/ (real data drop zone), iot/ (readings.db), notes/
```

---

## API overview

All routes have the `/api` prefix. Full schemas are at `/docs`.

| Area | Endpoints |
|---|---|
| Meta | `GET /health`, `/meta/provenance`, `/meta/models`, `/meta/zones` |
| Heat map | `GET /heatmap`, `/heatmap/zones/{zone_id}`, `/heatmap/toggle/{class_id}` |
| Drivers | `GET /drivers/global`, `/drivers/zone/{zone_id}`, `/drivers/correlations` |
| Forecast | `GET /forecast`, `/forecast/citywide` |
| PINN | `GET /pinn/metrics` |
| Interventions | `GET /interventions/catalogue`, `POST /interventions/optimize`, `GET /interventions/plan` |
| IoT | `GET /iot/latest`, `/iot/history`, `/iot/validation`, `/iot/status`, `/iot/stream` (SSE), `POST /iot/ingest` |
| Export | `POST /export/report.pdf`, `GET /export/heatmap.geojson`, `/export/heatmap.geotiff`, `/export/summary.csv` |

---

## Dashboard pages

| Route | Page |
|---|---|
| `/` | Overview: pipeline flow, key metrics, satellite ingest |
| `/heatmap` | Heat-stress map with layer switch (LST, NDVI, NDBI, SVF, impervious) and 3D buildings |
| `/drivers` | SHAP importance, beeswarm, waterfall, correlation matrix |
| `/forecast` | 48 h forecast with prediction intervals, residuals, PINN ablation |
| `/optimizer` | Intervention catalogue, Pareto front, recommended plan |
| `/sensors` | Live ESP32 readings and validation against ERA5 and satellite data |
| `/about` | Project and team info |

---

## Common tasks

| Task | make | Without make (run from repo root) |
|---|---|---|
| Install backend | `make setup` | `python -m pip install -r backend/requirements.txt` |
| Build artifacts | `make artifacts` | `python scripts/seed_demo.py` |
| Run API | `make dev` | `python scripts/dev.py` |
| Run tests | `make test` | `cd backend && python -m pytest tests -q` |
| Stream real sensor | `make bridge` | `cd backend; python -m iot.serial_bridge` |
| Clear artifacts | `make reset` | delete `backend/.artifacts/` |
| Production UI build | — | `cd frontend && npm run build` |

`docker-compose.yml` is only an outline. It doesn't install dependencies, and the app doesn't need Docker.

---

## Troubleshooting

- **API errors with `Artifact missing: … Run build_artifacts`**: the artifacts haven't been built. Run `python scripts/seed_demo.py`.
- **`ModuleNotFoundError: app` / `pipeline`**: run backend commands from inside `backend/`, or use the scripts in `scripts/`, which set `PYTHONPATH` for you.
- **Dashboard loads but API calls fail**: make sure the API is on port 8000. The Vite proxy in [frontend/vite.config.ts](frontend/vite.config.ts) expects it there.
- **CORS errors when serving the UI from another origin**: add that origin to `CORS_ORIGINS` in `.env`.

---

## Further docs

- [HARDWARE_DEMO.md](HARDWARE_DEMO.md): wiring, flashing and live-demo runbook for the ESP32 + DHT11 node
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md): 6-minute viva walkthrough
- [VIVA_QA.md](VIVA_QA.md): expected examiner questions and answers
- [DECISIONS.md](DECISIONS.md): shortcuts and assumptions
- [data/notes/DATA_SOURCES.md](data/notes/DATA_SOURCES.md): data provenance and hardware bill of materials
- `UrbanLens — Urban Heat Mitigation Project Document.md`: full project report

## License

MIT. See [LICENSE](LICENSE).
