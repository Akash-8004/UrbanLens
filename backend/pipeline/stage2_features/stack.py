import numpy as np


def build_feature_matrix(city: dict, max_samples: int | None = None) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    ch = city["channels"]
    h, w = city["land_mask"].shape
    names = ["ndvi", "ndbi", "mndwi", "impervious", "building_density", "mean_height", "svf", "era5_temp", "era5_humidity", "net_radiation"]
    planes = [np.nan_to_num(ch[n], nan=0.0).ravel() for n in names]
    X = np.column_stack(planes)
    lst = np.nan_to_num(ch["lst"], nan=0.0).ravel()
    land = city["land_mask"].ravel()
    zmap = city["zone_map"].ravel()
    rows = np.repeat(np.arange(h), w)
    m = land
    X, lst, zmap, rows = X[m], lst[m], zmap[m], rows[m]
    if max_samples and len(X) > max_samples:
        rng = np.random.default_rng(42)
        idx = rng.choice(len(X), max_samples, replace=False)
        X, lst, zmap, rows = X[idx], lst[idx], zmap[idx], rows[idx]
    return X, lst, zmap, rows
