import math

import numpy as np
from app.config import settings


def bbox_affine(lon_min, lat_min, lon_max, lat_max, h: int, w: int):
    """Cell (i,j) center: i row lat high→low, j col lon low→high."""
    dlon = (lon_max - lon_min) / w
    dlat = (lat_max - lat_min) / h
    return lon_min, lat_max, dlon, dlat


def cell_to_lonlat(i: int, j: int, lon_min, lat_max, dlon, dlat) -> tuple[float, float]:
    lon = lon_min + (j + 0.5) * dlon
    lat = lat_max - (i + 0.5) * dlat
    return lon, lat


def lonlat_to_cell(lon: float, lat: float, lon_min, lat_min, lon_max, lat_max, h: int, w: int):
    dlon = (lon_max - lon_min) / w
    dlat = (lat_max - lat_min) / h
    j = int((lon - lon_min) / dlon)
    i = int((lat_max - lat) / dlat)
    return max(0, min(h - 1, i)), max(0, min(w - 1, j))


def cell_size_m(h: int | None = None, w: int | None = None) -> tuple[float, float]:
    """Ground size (east-west, north-south) of one grid cell, in metres.

    Derived from the configured bbox and grid, so area figures stay correct when
    GRID_H/GRID_W or the bbox change.
    """
    h = h or settings.GRID_H
    w = w or settings.GRID_W
    lon_min, lat_min, lon_max, lat_max = settings.bbox
    mid_lat = math.radians((lat_min + lat_max) / 2)
    east_m = ((lon_max - lon_min) / w) * 111_320.0 * math.cos(mid_lat)
    north_m = ((lat_max - lat_min) / h) * 110_570.0
    return east_m, north_m


def cell_area_km2(h: int | None = None, w: int | None = None) -> float:
    east_m, north_m = cell_size_m(h, w)
    return (east_m * north_m) / 1e6


def grid_coords(h: int | None = None, w: int | None = None):
    h = h or settings.GRID_H
    w = w or settings.GRID_W
    bb = settings.bbox
    lon_min, lat_min, lon_max, lat_max = bb
    lon_min, lat_max, dlon, dlat = bbox_affine(lon_min, lat_min, lon_max, lat_max, h, w)
    ii, jj = np.meshgrid(np.arange(h), np.arange(w), indexing="ij")
    lons = lon_min + (jj + 0.5) * dlon
    lats = lat_max - (ii + 0.5) * dlat
    return lons, lats, (lon_min, lat_max, dlon, dlat)
