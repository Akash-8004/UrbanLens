# UrbanLens

A geospatial AI prototype for urban heat. It detects heat islands, explains what drives them (SHAP), forecasts heat 48 hours ahead, recommends cooling interventions (NSGA-II), and checks results against IoT ground truth from a physical sensor node.

The geospatial layers run fully offline on a seeded synthetic model of Mumbai's Western
Line corridor (South Mumbai to Palghar). The ground-truth feed is **real hardware**: an
ESP32 + DHT11 node streaming live air temperature and relative humidity.

**SJCEM · B.Tech IT · Final Year Major Project**

---

## Contents

- [Requirements](#requirements)
- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [IoT hardware node](#iot-hardware-node)
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

For the live sensor node (optional — the app runs without it):

| Item | Notes |
|---|---|
| ESP32 dev board (ESP-WROOM-32) | Any CP2102 or CH340 variant |
| DHT11 temperature + humidity module | 3-pin version, pull-up built in |
| 400-point breadboard, 3 male-to-female jumpers | Breadboard is required, not optional — both devices have male pins |
| Micro-USB **data** cable | A charge-only cable powers the board but never appears as a COM port |
| Arduino IDE 2.x + ESP32 board package + Adafruit `DHT sensor library` | Flashing toolchain |
| CP210x (or CH340) USB-serial driver | Without it the board shows device error code 28 and no COM port |

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

> A built-in simulator starts with the API, so the Sensors page works with no hardware
> attached. To stream the real node instead, see [IoT hardware node](#iot-hardware-node).

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

## IoT hardware node

A physical ESP32 + DHT11 node supplies the ground-truth feed. It measures **two real
quantities** — air temperature and relative humidity — both of which the heat
classifier consumes as features (`era5_temp`, `era5_humidity`).

Full wiring, flashing and demo instructions: **[HARDWARE_DEMO.md](HARDWARE_DEMO.md)**.

### Wiring

Identify module pins by their **printed label**, never by position — pin order differs
between modules.

| DHT11 module label | Role | ESP32 pin |
|---|---|---|
| `+` / `VCC` | power | `3V3` (**not** `5V`) |
| `S` / `OUT` / `DATA` | data | `GPIO 4` |
| `-` / `GND` | ground | any `GND` |

### Running it

```bash
# Terminal A — API
python scripts/dev.py

# Terminal B — serial bridge (ESP32 -> API)
cd backend
python -m iot.serial_bridge          # auto-detects the port; --list to see candidates

# Terminal C — dashboard
cd frontend && npm run dev
```

The Sensors page then shows a green **LIVE HARDWARE · ESP32 + DHT11** badge. Close the
Arduino Serial Monitor first — only one process can hold the COM port.

### How the two transports work

Both post to the same endpoint, so the backend does not care which is used:

```
ESP32 --USB serial--> iot/serial_bridge.py --HTTP--> POST /api/iot/ingest
ESP32 --WiFi-------------------------------HTTP--> POST /api/iot/ingest
```

- **Serial** ([hardware/urbanlens_node_serial/](hardware/urbanlens_node_serial/urbanlens_node_serial.ino)) — no network dependency. Use this for graded demos.
- **WiFi** ([hardware/urbanlens_node_wifi/](hardware/urbanlens_node_wifi/urbanlens_node_wifi.ino)) — no host process, but needs the laptop's LAN IP and `uvicorn --host 0.0.0.0`.
- **MQTT** ([backend/iot/mqtt_subscriber.py](backend/iot/mqtt_subscriber.py)) — third option, needs `paho-mqtt` and a broker.

### Simulator fallback

`GET /api/iot/status` reports which source is live. If no hardware reading arrives for
30 seconds (`LIVE_TTL_S` in [backend/iot/live.py](backend/iot/live.py)), the API reverts
to the simulator and the UI badge turns amber. Unplugging the board mid-demo degrades
gracefully instead of breaking the page. While hardware is live the simulator stops
writing to the database, so the history chart holds only real readings.

### Known gaps, stated plainly

- **One node, not a network.** It validates the pipeline end to end; spatial coverage
  would need many nodes.
- **No light sensor.** There is no LDR, so `lux_proxy` is reported as `null` rather than
  fabricated. The ingest endpoint already accepts the field.
- **DHT11 accuracy is ±2 °C / ±5 % RH** at 1-unit resolution. It is a teaching-grade
  part; the architecture is the contribution, not the sensor.
- **Air temperature is not land surface temperature.** The node measures air temp while
  the satellite layer models LST, which is why the Sensors page shows a bias comparison
  rather than expecting the two to agree.

---

## Prototype status

This table shows what is real and what is simulated.

| Layer | What runs | Status |
|---|---|---|
| Geospatial data | Seeded synthetic Mumbai corridor (140×100 grid, ~2900 km² land) | **Synthetic / demo** |
| Heat map | `HistGradientBoostingClassifier` (4 classes from LST percentiles) | Real sklearn model |
| U-Net / Bi-LSTM | Optional `torch` extras | Stubbed if torch is absent |
| PINN | Pure-NumPy MLP + energy-balance residual | Real ablation metrics |
| SHAP | `TreeExplainer` on the classifier | Real attributions |
| Forecast | Lag-feature regressor with prediction-interval bands | Real sklearn model |
| Optimizer | pymoo NSGA-II, knee-point plans | Real multi-objective optimisation |
| IoT ground truth | ESP32 + DHT11 node → serial bridge or WiFi → SSE stream | **Real hardware** (temp + humidity), simulator fallback |
| Satellite adapters | Landsat / Sentinel-2 / ERA5 / OSM modules | Stubs; fall back to synthetic |

The API tags every synthetic source in its provenance data, and the UI labels it
**SYNTHETIC / DEMO DATA**. The IoT feed is the one layer backed by physical measurement;
`GET /api/iot/status` reports whether the node or the simulator is currently live.

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
                   │  POST /api/iot/ingest
       ┌───────────┴────────────┐
   ESP32 + DHT11            simulator
   (serial bridge /         (fallback after
    WiFi / MQTT)             30 s of silence)
```

`python -m pipeline.build_artifacts` runs all four stages once and writes the results to `backend/.artifacts/`. The API only serves those precomputed files and never retrains on a request. The one exception is `/api/interventions/optimize`, which runs NSGA-II on demand.

---

## Project layout

```
backend/
  app/            FastAPI app: config, routers (api/), core helpers, schemas
  pipeline/       stage1_ingest → stage2_features → stage3_models → stage4_optimizer
                  build_artifacts.py — one-shot builder
  iot/            live.py (hardware store), serial_bridge.py (USB -> API),
                  simulator, MQTT subscriber, SQLite store
  exports/        PDF report and GeoTIFF writers
  tests/          pytest suite
frontend/
  src/pages/      Overview, HeatMap, Drivers, Forecast, Optimizer, Sensors, About
  src/components/ map, charts, sensors, layout, ui
  src/lib/api.ts  API client
  src/store/      zustand stores
hardware/         Arduino sketches: urbanlens_node_serial/ (demo), urbanlens_node_wifi/
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

Hardware node:

- **No COM port appears**: charge-only USB cable (try another), or the USB-serial driver
  is missing. Device error code 28 means no driver — install the CP210x or CH340 driver.
- **Bridge reports `Access is denied`**: the Arduino Serial Monitor still holds the port. Close it.
- **Board prints `# read failed`**: the data wire is not on `GPIO 4`, a jumper is loose,
  or the module was wired to `5V`.
- **Badge stays amber while the bridge prints readings**: hard-refresh the browser (Ctrl+Shift+R).
- **Restarting the bridge resets the sequence counter**: expected — opening the serial
  port reboots the ESP32. Start the bridge once and leave it running.

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
