"""Seeded Western Line synthetic city — Churchgate → Palghar corridor."""
from __future__ import annotations

from datetime import datetime, timedelta

import numpy as np

from app.config import settings
from app.core.hotspots import WESTERN_LINE_SPOTS


def _blur(a, sigma=2):
    k = max(3, int(sigma * 2) | 1)
    x = np.arange(k) - k // 2
    g = np.exp(-0.5 * (x / max(sigma, 0.5)) ** 2)
    g /= g.sum()
    pad = k // 2
    ap = np.pad(a, pad, mode="reflect")
    tmp = np.apply_along_axis(lambda r: np.convolve(r, g, mode="valid"), 1, ap)
    return np.apply_along_axis(lambda r: np.convolve(r, g, mode="valid"), 0, tmp)


# Absolute lon/lat stations (fractional unused — kept for tuple shape compatibility)
ZONES = [(s["zone_id"], s["name"], s["lon"], s["lat"]) for s in WESTERN_LINE_SPOTS]

# West-facing Arabian Sea coastline control points (south → north toward Palghar)
COAST_LON = np.array([72.70, 72.75, 72.78, 72.80, 72.82, 72.84, 72.86, 72.88, 72.90])
COAST_LAT = np.array([19.85, 19.70, 19.55, 19.40, 19.25, 19.10, 18.98, 18.92, 18.88])


def _noise(h, w, seed, octaves=4):
    rng = np.random.default_rng(seed)
    acc = np.zeros((h, w))
    yy, xx = np.mgrid[0:h, 0:w]
    for k in range(octaves):
        s = 2**k
        sh, sw = max(2, h // s), max(2, w // s)
        up = _blur(rng.standard_normal((sh, sw)), sigma=1.5)
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
        # west of coastline ≈ sea for this parametric curve
        mask[:, j] = lons[:, j] >= (COAST_LON[0] + 0.02)  # coarse land east of coast strip
        # refine: points west of interpolated coast lon at that lat are water
    # Better: for each cell, coast_lon at this lat
    coast_at_lat = np.interp(lats, COAST_LAT[::-1], COAST_LON[::-1])
    mask = lons >= coast_at_lat - 0.01
    return mask


def _zone_id(lons, lats):
    """Nearest Western Line station assignment."""
    zmap = np.zeros(lons.shape, dtype=int)
    best = np.full(lons.shape, np.inf)
    for zi, (_, _, lon_c, lat_c) in enumerate(ZONES):
        d = (lons - lon_c) ** 2 + (lats - lat_c) ** 2
        nearer = d < best
        zmap = np.where(nearer, zi, zmap)
        best = np.where(nearer, d, best)
    return zmap


def generate_city(seed: int | None = None) -> dict:
    seed = seed if seed is not None else settings.SEED
    h, w = settings.GRID_H, settings.GRID_W
    lons, lats, _ = __import__("app.core.grid", fromlist=["grid_coords"]).grid_coords(h, w)
    land = _land_mask(lons, lats)
    urban = _noise(h, w, seed)
    # Western Line spine ~ lon 72.82–72.86, lat 18.9–19.85
    corridor = np.exp(-((lons - 72.84) ** 2 / 0.0018 + ((lats - 19.25) / 0.55) ** 2 / 0.35))
    # denser south (island city) + Mira-Bhayandar / Vasai pockets
    south = np.exp(-((lats - 19.05) ** 2 / 0.015))
    urban = np.clip(0.25 * urban + 0.55 * corridor + 0.25 * south * corridor, 0, 1)
    parks = _blur(_noise(h, w, seed + 1), 8)
    parks = (parks > 0.74).astype(float) * 0.85
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
    for _ in range(min(900, int(urban.sum() * 60))):
        i, j = rng.integers(0, h), rng.integers(0, w)
        if urban[i, j] < 0.45 or not land[i, j]:
            continue
        lon, lat = float(lons[i, j]), float(lats[i, j])
        d = 0.0007 * (0.5 + urban[i, j])
        feats.append({
            "type": "Feature",
            "properties": {"mean_height_m": float(height[i, j])},
            "geometry": {"type": "Polygon", "coordinates": [[
                [lon - d, lat - d], [lon + d, lat - d], [lon + d, lat + d], [lon - d, lat + d], [lon - d, lat - d],
            ]]},
        })
    return {"type": "FeatureCollection", "features": feats}


def _roads_geojson():
    # Polyline along western stations south→north
    coords = [[s["lon"], s["lat"]] for s in WESTERN_LINE_SPOTS if s["zone_id"] not in ("kurla", "powai", "chembur", "andheri_e")]
    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {"name": "Western Line"},
            "geometry": {"type": "LineString", "coordinates": coords},
        }],
    }


def _zones_geojson(lons, lats, zmap):
    feats = []
    for zi, (zid, name, lon_c, lat_c) in enumerate(ZONES):
        mask = zmap == zi
        if mask.any():
            lon_m, lat_m = float(lons[mask].mean()), float(lats[mask].mean())
            area = float(mask.sum()) * 0.0009
        else:
            lon_m, lat_m, area = float(lon_c), float(lat_c), 1.0
        pad = 0.02
        feats.append({
            "type": "Feature",
            "id": zid,
            "properties": {"name": name, "centroid": [lon_m, lat_m], "area_km2": area},
            "geometry": {"type": "Polygon", "coordinates": [[
                [lon_m - pad, lat_m - pad], [lon_m + pad, lat_m - pad],
                [lon_m + pad, lat_m + pad], [lon_m - pad, lat_m + pad], [lon_m - pad, lat_m - pad],
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
            hw = 3.5 if 360 <= h < 432 else 0.0
            prev = 0.85 * prev + 0.15 * (base + diurnal + hw) + rng.normal(0, 0.3)
            series.append({
                "ts": dt.isoformat(), "lst": prev, "humidity": 70 - 0.8 * (prev - 30),
                "wind": 2 + rng.normal(0, 0.2), "ndvi": 0.35 + rng.normal(0, 0.02),
            })
        data[zid] = series
    return data
