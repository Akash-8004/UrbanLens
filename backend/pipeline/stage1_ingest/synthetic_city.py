"""Seeded Mumbai synthetic city — 10-channel stack + vectors + timeseries."""
from __future__ import annotations

import json
from datetime import datetime, timedelta

import numpy as np

from app.config import settings


def _blur(a, sigma=2):
    k = max(3, int(sigma * 2) | 1)
    x = np.arange(k) - k // 2
    g = np.exp(-0.5 * (x / max(sigma, 0.5)) ** 2)
    g /= g.sum()
    pad = k // 2
    ap = np.pad(a, pad, mode="reflect")
    tmp = np.apply_along_axis(lambda r: np.convolve(r, g, mode="valid"), 1, ap)
    return np.apply_along_axis(lambda r: np.convolve(r, g, mode="valid"), 0, tmp)

ZONES = [
    ("andheri_e", "Andheri East", 0.55, 0.45),
    ("andheri_w", "Andheri West", 0.35, 0.42),
    ("bandra", "Bandra", 0.42, 0.38),
    ("santacruz", "Santacruz", 0.48, 0.35),
    ("powai", "Powai", 0.62, 0.55),
    ("goregaon", "Goregaon", 0.52, 0.58),
    ("dadar", "Dadar", 0.58, 0.32),
    ("mahim", "Mahim", 0.50, 0.30),
    ("sion", "Sion", 0.65, 0.28),
    ("wadala", "Wadala", 0.68, 0.35),
    ("chembur", "Chembur", 0.72, 0.42),
    ("kurla", "Kurla", 0.70, 0.48),
]

COAST_LON = np.array([72.78, 72.82, 72.86, 72.90, 72.94, 72.98, 73.00])
COAST_LAT = np.array([19.05, 19.02, 18.98, 18.94, 18.92, 18.91, 18.90])


def _noise(h, w, seed, octaves=4):
    rng = np.random.default_rng(seed)
    acc = np.zeros((h, w))
    yy, xx = np.mgrid[0:h, 0:w]
    for k in range(octaves):
        s = 2**k
        sh, sw = max(2, h // s), max(2, w // s)
        up = _blur(rng.standard_normal((sh, sw)), sigma=1.5)
        # nearest upsample without ragged repeat broadcasting
        yi = np.clip((yy * sh / h).astype(int), 0, sh - 1)
        xi = np.clip((xx * sw / w).astype(int), 0, sw - 1)
        acc += up[yi, xi] / (k + 1)
    acc -= acc.min()
    acc /= acc.max() + 1e-9
    return acc


def _land_mask(lons, lats):
    mask = np.ones(lons.shape, dtype=bool)
    for j in range(lons.shape[1]):
        lat_coast = np.interp(lons[0, j], COAST_LON, COAST_LAT)
        mask[:, j] = lats[:, j] >= lat_coast - 0.002
    return mask


def _zone_id(lons, lats):
    zmap = np.zeros(lons.shape, dtype=int)
    for zi, (_, _, cx, cy) in enumerate(ZONES):
        d = (lons - (settings.BBOX_MIN_LON + cx * (settings.BBOX_MAX_LON - settings.BBOX_MIN_LON))) ** 2
        d += (lats - (settings.BBOX_MIN_LAT + cy * (settings.BBOX_MAX_LAT - settings.BBOX_MIN_LAT))) ** 2
        zmap = np.where(d < 0.0025, zi, zmap)
    return zmap


def generate_city(seed: int | None = None) -> dict:
    seed = seed if seed is not None else settings.SEED
    h, w = settings.GRID_H, settings.GRID_W
    lons, lats, _ = __import__("app.core.grid", fromlist=["grid_coords"]).grid_coords(h, w)
    land = _land_mask(lons, lats)
    urban = _noise(h, w, seed)
    corridor = np.exp(-((lons - 72.88) ** 2 / 0.002 + (lats - 19.08) ** 2 / 0.003))
    urban = np.clip(0.35 * urban + 0.65 * corridor, 0, 1)
    parks = _blur(_noise(h, w, seed + 1), 8)
    parks = (parks > 0.72).astype(float) * 0.85
    water = (~land).astype(float)
    ndvi = np.clip(0.15 + 0.55 * parks - 0.35 * urban, -0.2, 0.85)
    ndvi[water > 0.5] = 0.05
    ndbi = np.clip(0.1 + 0.55 * urban - 0.25 * parks, -0.5, 0.6)
    mndwi = np.clip(0.4 * water - 0.2 * urban, -1, 1)
    imperv = np.clip(30 + 65 * urban - 20 * parks, 0, 100)
    bld_d = np.clip(urban * 0.9, 0, 1)
    height = np.clip(3 + 42 * (urban**1.3), 0, 45)
    svf = np.clip(0.35 + 0.55 * (1 - bld_d) + 0.1 * parks, 0.3, 1.0)
    era5_t = 30 + 2 * _blur(_noise(h, w, seed + 2), 12)
    era5_h = np.clip(75 - 15 * urban + 5 * water * 100, 40, 95)
    era5_w = np.clip(2 + 3 * (1 - urban) + _blur(_noise(h, w, seed + 3), 6), 0.5, 8)
    rn = np.clip(450 + 180 * (1 - ndvi) + 80 * ndbi - 60 * svf, 200, 750)
    lst = (
        31
        + 8 * (1 - ndvi)
        + 0.06 * imperv
        + 6 * (1 - svf)
        + 0.15 * (100 - era5_h)
        - 0.4 * era5_w
        + _blur(_noise(h, w, seed + 4), 3) * 2
    )
    lst = np.clip(lst, 29, 52)
    for arr in (ndvi, ndbi, lst, imperv, svf):
        arr[~land] = np.nan
    zmap = _zone_id(lons, lats)
    buildings = _buildings_geojson(lons, lats, urban, height, land, seed)
    roads = _roads_geojson()
    zones_geo = _zones_geojson(lons, lats, zmap)
    ts = _timeseries(seed)
    stack = np.stack(
        [lst, ndvi, ndbi, mndwi, imperv, bld_d, height, svf, era5_t, era5_h, era5_w, rn], axis=-1
    )
    names = [
        "lst", "ndvi", "ndbi", "mndwi", "impervious", "building_density", "mean_height", "svf",
        "era5_temp", "era5_humidity", "era5_wind", "net_radiation",
    ]
    return {
        "lons": lons, "lats": lats, "land_mask": land, "zone_map": zmap,
        "channels": dict(zip(names, [stack[..., i] for i in range(len(names))])),
        "stack": stack, "feature_names": names[:10],
        "buildings": buildings, "roads": roads, "zones": zones_geo,
        "timeseries": ts, "zone_defs": ZONES, "synthetic": True, "seed": seed,
    }


def _buildings_geojson(lons, lats, urban, height, land, seed):
    rng = np.random.default_rng(seed + 99)
    feats = []
    h, w = urban.shape
    for _ in range(min(800, int(urban.sum() * 80))):
        i, j = rng.integers(0, h), rng.integers(0, w)
        if urban[i, j] < 0.45 or not land[i, j]:
            continue
        lon, lat = float(lons[i, j]), float(lats[i, j])
        d = 0.0008 * (0.5 + urban[i, j])
        feats.append({
            "type": "Feature",
            "properties": {"mean_height_m": float(height[i, j])},
            "geometry": {"type": "Polygon", "coordinates": [[
                [lon - d, lat - d], [lon + d, lat - d], [lon + d, lat + d], [lon - d, lat + d], [lon - d, lat - d],
            ]]},
        })
    return {"type": "FeatureCollection", "features": feats}


def _roads_geojson():
    feats = []
    for a, b in [(0, 6), (6, 11), (1, 2), (2, 7), (11, 10), (4, 5)]:
        _, na, cxa, cya = ZONES[a]
        _, nb, cxb, cyb = ZONES[b]
        lon_a = settings.BBOX_MIN_LON + cxa * (settings.BBOX_MAX_LON - settings.BBOX_MIN_LON)
        lat_a = settings.BBOX_MIN_LAT + cya * (settings.BBOX_MAX_LAT - settings.BBOX_MIN_LAT)
        lon_b = settings.BBOX_MIN_LON + cxb * (settings.BBOX_MAX_LON - settings.BBOX_MIN_LON)
        lat_b = settings.BBOX_MIN_LAT + cyb * (settings.BBOX_MAX_LAT - settings.BBOX_MIN_LAT)
        feats.append({"type": "Feature", "properties": {}, "geometry": {"type": "LineString", "coordinates": [[lon_a, lat_a], [lon_b, lat_b]]}})
    return {"type": "FeatureCollection", "features": feats}


def _zones_geojson(lons, lats, zmap):
    feats = []
    for zi, (zid, name, _, _) in enumerate(ZONES):
        mask = zmap == zi
        if not mask.any():
            continue
        lon_c, lat_c = float(lons[mask].mean()), float(lats[mask].mean())
        lon_min, lon_max = float(lons[mask].min()), float(lons[mask].max())
        lat_min, lat_max = float(lats[mask].min()), float(lats[mask].max())
        feats.append({
            "type": "Feature",
            "id": zid,
            "properties": {"name": name, "centroid": [lon_c, lat_c], "area_km2": float(mask.sum()) * 0.0009},
            "geometry": {"type": "Polygon", "coordinates": [[
                [lon_min, lat_min], [lon_max, lat_min], [lon_max, lat_max], [lon_min, lat_max], [lon_min, lat_min],
            ]]},
        })
    return {"type": "FeatureCollection", "features": feats}


def _timeseries(seed):
    rng = np.random.default_rng(seed + 7)
    t0 = datetime(2025, 3, 1)
    hours = 30 * 24
    data = {}
    for zid, name, _, _ in ZONES:
        base = 32 + rng.normal(0, 0.5)
        series = []
        prev = base
        for h in range(hours):
            dt = t0 + timedelta(hours=h)
            hour = dt.hour
            diurnal = 4 * np.sin((hour - 14) * np.pi / 12)
            hw = 3.5 if 360 <= h < 432 else 0.0  # heat wave days 15-18
            prev = 0.85 * prev + 0.15 * (base + diurnal + hw) + rng.normal(0, 0.3)
            series.append({
                "ts": dt.isoformat(), "lst": prev, "humidity": 70 - 0.8 * (prev - 30),
                "wind": 2 + rng.normal(0, 0.2), "ndvi": 0.35 + rng.normal(0, 0.02),
            })
        data[zid] = series
    return data
