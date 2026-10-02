"""One-shot artifact builder — run: cd backend && python -m pipeline.build_artifacts"""
from __future__ import annotations

import argparse
import base64
import io
import json
import time
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from PIL import Image

from app.config import settings
from app.core.io_artifacts import write_json
from app.core.logging import log
from pipeline.stage1_ingest.registry import load_city_data
from pipeline.stage3_models.forecaster import train_forecast
from pipeline.stage3_models.heat_classifier import CLASS_NAMES, train_heat_classifier
from pipeline.stage3_models.pinn import train_pinn
from pipeline.stage3_models.registry import build_registry
from pipeline.stage3_models.shap_drivers import compute_shap
from pipeline.stage3_models.unet import train_unet
from pipeline.stage4_optimizer.interventions import catalogue_dict
from pipeline.stage4_optimizer.scenarios import run_scenarios


def _rgba_layer(arr, cmap="thermal", vmin=None, vmax=None):
    a = np.array(arr, dtype=float)
    if vmin is None:
        vmin, vmax = np.nanpercentile(a, 2), np.nanpercentile(a, 98)
    t = np.clip((a - vmin) / (vmax - vmin + 1e-9), 0, 1)
    if cmap == "stress":
        colors = np.array([[59, 130, 246], [34, 211, 238], [245, 158, 11], [239, 68, 68]], dtype=np.uint8)
        idx = np.nan_to_num(a, nan=0).astype(int)
        idx = np.clip(idx, 0, 3)
        rgb = colors[idx]
        m = np.isfinite(a) & (a < 4)
    else:
        rgb = np.stack([255 * t, 80 * (1 - t), 50 * t], -1)
        m = np.isfinite(a)
    alpha = (m.astype(np.float32) * 220).astype(np.uint8)
    return np.dstack([np.nan_to_num(rgb, nan=0).astype(np.uint8), alpha])


def _b64_png(rgba):
    im = Image.fromarray(rgba, mode="RGBA")
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _hotspots(classes, lst, lons, lats, zone_defs, zmap, top=8):
    ranked = []
    for zi, (zid, name, _, _) in enumerate(zone_defs):
        mask = zmap == zi
        if not mask.any():
            continue
        peak = float(np.nanmax(lst[mask]))
        ranked.append((peak, zid, name, mask))
    ranked.sort(reverse=True)
    spots = []
    for k, (peak, zid, name, mask) in enumerate(ranked[:top]):
        ii, jj = np.where(mask & (lst == peak))
        if len(ii) == 0:
            ii, jj = np.where(mask)
        i, j = int(ii[0]), int(jj[0])
        cls = int(classes[i, j]) if classes[i, j] < 4 else 3
        spots.append({
            "id": f"hs_{k}", "name": name, "class": cls, "zone_id": zid,
            "lat": float(lats[i, j]), "lon": float(lons[i, j]),
            "area_km2": float(mask.sum()) * 0.0009, "peak_lst": peak, "top_drivers": [],
        })
    return spots


def main(source: str | None = None):
    t0 = time.time()
    log.info("Generating city (seed=%s, grid=%sx%s)", settings.SEED, settings.GRID_H, settings.GRID_W)
    city = load_city_data(source)
    ch = city["channels"]
    lons, lats = city["lons"], city["lats"]
    heat = train_heat_classifier(city)
    clf = heat["model"]
    classes = heat["classes"]
    lst = ch["lst"]
    log.info("Training PINN + forecast + SHAP + optimizer")
    pinn_m = train_pinn(city)
    fc = train_forecast(city)
    shap_m = compute_shap(city, clf)
    unet_s = train_unet()
    # correlations
    keys = ["lst", "ndvi", "ndbi", "impervious", "svf", "net_radiation"]
    flat = {k: ch[k][city["land_mask"]].ravel() for k in keys}
    corr = pd.DataFrame(flat).corr().round(3).to_dict()
    print("Correlation self-check:\n", pd.DataFrame(flat).corr().round(2))
    zone_summary = {}
    zone_stats = {}
    zmap = city["zone_map"]
    for zi, (zid, name, _, _) in enumerate(city["zone_defs"]):
        m = zmap == zi
        if not m.any():
            continue
        zlst = lst[m]
        zcls = classes[m]
        area_km2 = float(m.sum()) * 0.0009
        zone_summary[zid] = {
            "name": name, "mean_lst": float(np.nanmean(zlst)), "max_lst": float(np.nanmax(zlst)),
            "area_km2": area_km2,
            "class_area_km2": {CLASS_NAMES[c]: float((zcls == c).sum()) * 0.0009 for c in range(4)},
            "population_proxy": int(area_km2 * 15000),
            "dominant_lulc": "built-up" if float(np.nanmean(ch["ndbi"][m])) > 0.2 else "mixed",
            "top_drivers": [d["feature"] for d in shap_m["zones"].get(zid, [])[:3]],
            "insight": shap_m["insights"].get(zid, ""),
        }
        zone_stats[zid] = {"mean_lst": float(np.nanmean(zlst)), "area_m2": area_km2 * 1e6, "area_km2": area_km2}
    plans = run_scenarios(zone_stats)
    layers = {
        "heat_stress": _b64_png(_rgba_layer(classes, "stress")),
        "lst": _b64_png(_rgba_layer(lst)),
        "ndvi": _b64_png(_rgba_layer(ch["ndvi"])),
        "ndbi": _b64_png(_rgba_layer(ch["ndbi"])),
        "svf": _b64_png(_rgba_layer(ch["svf"])),
        "impervious": _b64_png(_rgba_layer(ch["impervious"])),
    }
    bbox = list(settings.bbox)
    heatmap = {
        "width": settings.GRID_W, "height": settings.GRID_H, "bbox": bbox,
        "classes": CLASS_NAMES,
        "legend": [{"class": i, "name": CLASS_NAMES[i], "color": c} for i, c in enumerate(["#3B82F6", "#22D3EE", "#F59E0B", "#EF4444"])],
        "stats": {"min": float(np.nanmin(lst)), "max": float(np.nanmax(lst)), "mean": float(np.nanmean(lst))},
        "hotspots": _hotspots(classes, lst, lons, lats, city["zone_defs"], zmap),
        "layers": layers,
        "confusion_matrix": heat["confusion_matrix"],
        "classifier_metrics": heat["metrics"],
    }
    write_json("heatmap", heatmap)
    write_json("heatmap_pngs", layers)
    write_json("zone_summary", zone_summary)
    write_json("drivers_global", {"importance": shap_m["global"], "beeswarm": shap_m["beeswarm"], "waterfall_hottest": shap_m["waterfall_hottest"]})
    write_json("drivers_zones", {"zones": shap_m["zones"], "insights": shap_m["insights"]})
    write_json("correlations", corr)
    write_json("forecast", {"horizons": fc["horizons"], "metrics": fc["metrics"], "series": fc["series"]})
    write_json("interventions_catalogue", catalogue_dict())
    write_json("interventions_plans", plans)
    write_json("pinn_metrics", pinn_m)
    fm = {z: fc["metrics"].get(z, {}) for z in fc["metrics"]}
    write_json("model_registry", build_registry(heat["metrics"], pinn_m, fm, unet_s))
    write_json("provenance", {
        "synthetic": True, "demo_mode": settings.DEMO_MODE, "seed": settings.SEED,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sources": [{"name": "synthetic_city", "synthetic": True, "resolution_m": 30, "license": "N/A"}],
    })
    write_json("zones", city["zones"])
    (settings.ARTIFACTS_DIR / "buildings.geojson").write_text(json.dumps(city["buildings"]), encoding="utf-8")
    # IoT validation stub
    rng = np.random.default_rng(42)
    sensor = 32 + rng.normal(0, 0.5, 100)
    era5 = sensor + rng.normal(1.2, 0.8, 100)
    sat = sensor + 4 + rng.normal(0, 1, 100)
    write_json("iot_validation", {
        "bias_era5": {"mean_diff_c": float(np.mean(sensor - era5)), "rmse_c": float(np.sqrt(np.mean((sensor - era5) ** 2)))},
        "lst_vs_air": {"mean_diff_c": float(np.mean(sat - sensor)), "note": "LST exceeds air temp — expected for urban surfaces"},
    })
    log.info("Done in %.1fs", time.time() - t0)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default=None)
    main(ap.parse_args().source)
