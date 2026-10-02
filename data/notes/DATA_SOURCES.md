# Data sources & hardware BOM

## Demo mode (default)
All rasters and time series come from `pipeline/stage1_ingest/synthetic_city.py` (seed=42, Mumbai bbox ~18.90–19.20 N, 72.78–73.00 E). Provenance flag `synthetic=true` is exposed at `/api/meta/provenance` and rendered as **SYNTHETIC / DEMO DATA** in the UI.

## Real adapters (optional, not on critical path)
| Source | Module | Notes |
|--------|--------|-------|
| Landsat 8 LST | `landsat.py` | GEE `LANDSAT/LC08/C02/T1_L2` ST_B10 |
| Sentinel-2 | `sentinel2.py` | GEE SR harmonized B8/B4/B11 |
| ERA5 | `era5.py` | CDS API `2m_temperature` |
| OSM morphology | `osm_morphology.py` | Falls back to synthetic |

## IoT BOM (ESP32 demo node)
| Part | Qty | Approx ₹ |
|------|-----|----------|
| ESP32 DevKit | 1 | 350–500 |
| DHT11 | 1 (GPIO4) | 80–120 |
| LDR + 10kΩ divider | 1 (ADC) | 20–40 |
| USB 5V power | 1 | — |
| **Total** | | **~₹500–700** |

Firmware sketch: `backend/iot/esp32_firmware.py`  
Simulator (default): `backend/iot/esp32_simulator.py` → SSE `/api/iot/stream`

## Citations (intervention catalogue)
See `backend/pipeline/stage4_optimizer/interventions.py` — EPA Heat Island Compendium, Akbari et al. 2001, Santamouris 2014, UNEP Urban Cooling.
