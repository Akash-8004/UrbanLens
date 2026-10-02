# Decisions & shortcuts

Record of intentional trade-offs for the UrbanLens demo prototype.

| Decision | Why |
|---|---|
| Default grid **120×120** (not 240×240) | Artifact build finishes in <3 min on a laptop; spatial structure still readable. |
| `DEMO_MODE=True` + synthetic city | Zero API keys / offline viva; real adapters exist as thin fallbacks. |
| Heat classifier = `HistGradientBoostingClassifier` | Fast, SHAP `TreeExplainer`-compatible stand-in for U-Net; torch optional. |
| PINN in pure NumPy | Demonstrates physics residual without heavy deps; torch not required. |
| NSGA-II pop=28 / gen=25 | Pareto quality sufficient for demo; full 100×150 documented as future scale-up. |
| IoT defaults to in-process simulator + SSE | Demo never shows empty sensors if MQTT broker missing. |
| CARTO Dark Matter raster tiles | Free, no Mapbox token; requires network for basemap only (overlays work offline from artifacts). |
| Seed = 42 everywhere | Reproducible viva runs. |
| Artifact-first API | Endpoints never retrain; cold start <10 s after first build. |
| Intervention ΔT ranges literature-labelled | Honest ranges, not invented precision. |

## Known limitations

- Basemap tiles need internet; heat overlays and charts do not.
- Single simulated IoT node (proof-of-concept).
- Building footprints are procedural rectangles, not OSM extracts in demo mode.
- Forecast PI bands derived from residual RMSE, not full quantile regression.
