# UrbanLens

Geospatial AI prototype for urban heat-island detection, driver attribution (SHAP), 48h heat forecasting, NSGA-II cooling interventions, and IoT ground-truth — demoted on synthetic Mumbai data for offline demos.

**SJCEM · B.Tech IT · Final Year Major Project**

## Quickstart

```bash
# 1) Backend deps
python -m pip install -r backend/requirements.txt

# 2) Generate artifacts (~1–3 min, once)
cd backend && python -m pipeline.build_artifacts && cd ..

# 3) Frontend deps
cd frontend && npm install && cd ..

# 4) Run (two terminals, or scripts/dev.py)
# Terminal A — API
cd backend && uvicorn app.main:app --reload --port 8000
# Terminal B — UI
cd frontend && npm run dev
```

Open http://localhost:5173 — API at http://localhost:8000/docs

Or: `python scripts/dev.py` (starts API + IoT sim; start Vite separately if needed).

## Prototype status (honest)

| Layer | What runs | Status |
|---|---|---|
| Data | Seeded synthetic Mumbai city (120×120 ~30 m) | **Synthetic / demo** |
| Heat map | `HistGradientBoostingClassifier` (4-class LST percentiles) | Real sklearn math |
| U-Net / Bi-LSTM | Optional `torch` extras | Stubbed if torch absent |
| PINN | Pure-NumPy MLP + energy-balance residual | Real ablation metrics |
| SHAP | `TreeExplainer` on classifier | Real attributions |
| Forecast | Lag-feature regressor, PI bands | Real sklearn math |
| Optimizer | pymoo NSGA-II, knee-point plans | Real multi-objective |
| IoT | ESP32 simulator → SSE (MQTT optional) | Simulated by default |
| Real satellite adapters | Landsat/Sentinel/ERA5 stubs | Fallback to synthetic |

Every synthetic source is tagged in API provenance and shown as **SYNTHETIC / DEMO DATA** in the UI.

## Architecture

1. **Ingest** → synthetic city (+ optional real adapters)  
2. **Features** → NDVI/NDBI/MNDWI, morphology, stacked channels  
3. **Models** → heat classifier, PINN, forecast, SHAP  
4. **Optimizer** → intervention catalogue + NSGA-II  
5. **Dashboard** → React + MapLibre mission-control UI  

Artifacts live in `backend/.artifacts/` and are served by FastAPI — no retrain on request.

## Makefile

| Target | Action |
|---|---|
| `make setup` | pip install backend |
| `make artifacts` | regenerate `.artifacts/` |
| `make dev` | launch scripts/dev.py |
| `make test` | pytest |
| `make reset` | clear artifacts |

## Docs

- `DEMO_SCRIPT.md` — 6-minute viva walkthrough  
- `VIVA_QA.md` — examiner Q&A  
- `DECISIONS.md` — shortcuts & assumptions  
- `data/notes/DATA_SOURCES.md` — provenance + hardware BOM  

## License

MIT — see `LICENSE`.
