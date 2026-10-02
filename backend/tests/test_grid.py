from app.core.grid import cell_to_lonlat, lonlat_to_cell, grid_coords
from app.config import settings


def test_lonlat_roundtrip():
    lons, lats, aff = grid_coords(10, 10)
    lon_min, lat_max, dlon, dlat = aff
    i, j = lonlat_to_cell(lons[5, 5], lats[5, 5], *settings.bbox[:2], *settings.bbox[2:], 10, 10)
    assert abs(i - 5) <= 1 and abs(j - 5) <= 1
