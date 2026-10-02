import numpy as np
import shap

from pipeline.stage3_models.heat_classifier import FEATURE_NAMES

LABELS = {
    "ndvi": "vegetation (NDVI)",
    "ndbi": "built-up intensity (NDBI)",
    "mndwi": "water/moisture (MNDWI)",
    "impervious": "impervious cover",
    "building_density": "building density",
    "mean_height": "building height",
    "svf": "sky view factor",
    "era5_temp": "background temperature",
    "era5_humidity": "humidity",
    "net_radiation": "net radiation",
}


def _to_abs_matrix(sv, n_samples: int, n_feat: int) -> np.ndarray:
    """Normalize TreeExplainer output to (n_samples, n_features) mean |SHAP|."""
    if isinstance(sv, list):
        stacked = np.stack([np.abs(s) for s in sv], axis=0)  # (C, N, F)
        return stacked.mean(axis=0)
    arr = np.asarray(sv)
    if arr.ndim == 3:
        # (N, F, C) or (C, N, F)
        if arr.shape[0] == n_samples and arr.shape[1] == n_feat:
            return np.abs(arr).mean(axis=2)
        if arr.shape[1] == n_samples and arr.shape[2] == n_feat:
            return np.abs(arr).mean(axis=0)
        return np.abs(arr).reshape(n_samples, n_feat, -1).mean(axis=2)
    if arr.ndim == 2:
        return np.abs(arr)
    return np.abs(arr).reshape(n_samples, n_feat)


def compute_shap(city: dict, clf, max_bg=400, max_eval=600) -> dict:
    from pipeline.stage2_features.stack import build_feature_matrix

    X, lst, zmap, _ = build_feature_matrix(city, max_samples=max_eval)
    n_feat = len(FEATURE_NAMES)
    rng = np.random.default_rng(42)
    idx = rng.choice(len(X), min(max_bg, len(X)), replace=False)
    bg = X[idx]
    expl = shap.TreeExplainer(clf, bg)
    raw = expl.shap_values(X)
    sv = _to_abs_matrix(raw, len(X), n_feat)
    mean_abs = np.asarray(sv.mean(axis=0)).ravel()
    order = np.argsort(-mean_abs)
    global_imp = [
        {
            "feature": FEATURE_NAMES[int(i)],
            "label": LABELS.get(FEATURE_NAMES[int(i)], FEATURE_NAMES[int(i)]),
            "mean_abs_shap": float(mean_abs[int(i)]),
        }
        for i in order
    ]
    beeswarm = [
        {"features": FEATURE_NAMES, "values": X[i].tolist(), "shap": sv[i].tolist()}
        for i in range(min(150, len(X)))
    ]
    zone_imp, insights = {}, {}
    for zi, (zid, name, _, _) in enumerate(city["zone_defs"]):
        m = zmap == zi
        if m.sum() < 10:
            continue
        zm = np.asarray(sv[m].mean(axis=0)).ravel()
        ranked = sorted(
            [(FEATURE_NAMES[i], float(zm[i])) for i in range(n_feat)],
            key=lambda x: -x[1],
        )
        zone_imp[zid] = [{"feature": f, "mean_abs_shap": v} for f, v in ranked]
        top3 = ranked[:3]
        insights[zid] = (
            f"{name}'s heat stress is driven primarily by high {LABELS.get(top3[0][0], top3[0][0])}, "
            f"{LABELS.get(top3[1][0], top3[1][0])} and {LABELS.get(top3[2][0], top3[2][0])}."
        )
    hot_i = int(np.nanargmax(city["channels"]["lst"]))
    hi, hj = np.unravel_index(hot_i, city["channels"]["lst"].shape)
    Xhot = np.nan_to_num(np.array([[city["channels"][n][hi, hj] for n in FEATURE_NAMES]]))
    wf_raw = expl.shap_values(Xhot)
    if isinstance(wf_raw, list):
        wf = np.asarray(wf_raw[-1][0]).ravel()
    else:
        wf_arr = np.asarray(wf_raw)
        if wf_arr.ndim == 3:
            wf = wf_arr[0, :, -1] if wf_arr.shape[1] == n_feat else wf_arr[-1, 0, :]
        else:
            wf = wf_arr.ravel()[:n_feat]
    waterfall = [{"feature": FEATURE_NAMES[i], "shap": float(wf[i])} for i in range(n_feat)]
    return {
        "global": global_imp,
        "zones": zone_imp,
        "insights": insights,
        "beeswarm": beeswarm,
        "waterfall_hottest": waterfall,
    }
