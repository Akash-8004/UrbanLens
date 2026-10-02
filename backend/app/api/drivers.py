from fastapi import APIRouter, HTTPException

from app.core.io_artifacts import read_json

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.get("/global")
def drivers_global():
    raw = read_json("drivers_global")
    importance = raw.get("importance") or raw.get("global") or []
    beeswarm_raw = raw.get("beeswarm") or []
    # flatten beeswarm rows → {feature, shap, value} points
    flat = []
    for row in beeswarm_raw[:80]:
        feats = row.get("features") or []
        vals = row.get("values") or []
        shaps = row.get("shap") or []
        for i, f in enumerate(feats):
            if i < len(shaps) and i < len(vals):
                flat.append({"feature": f, "shap": float(shaps[i]), "value": float(vals[i])})
    waterfall = raw.get("waterfall_hottest") or raw.get("waterfall") or []
    return {
        "global_importance": importance,
        "importance": importance,
        "beeswarm": flat,
        "waterfall": waterfall,
        "waterfall_hottest": waterfall,
    }


@router.get("/zone/{zone_id}")
def drivers_zone(zone_id: str):
    dz = read_json("drivers_zones")
    if zone_id not in dz.get("zones", {}):
        raise HTTPException(404, "zone not found")
    return {
        "zone_id": zone_id,
        "importance": dz["zones"][zone_id],
        "insight": dz.get("insights", {}).get(zone_id, ""),
    }


@router.get("/correlations")
def correlations():
    corr = read_json("correlations")
    # pandas to_dict() → {col: {row: val}}
    features = list(corr.keys())
    matrix = []
    for f in features:
        row = corr[f]
        if isinstance(row, dict):
            matrix.append([float(row.get(g, 0) or 0) for g in features])
        else:
            matrix.append([float(x) for x in row])
    return {"features": features, "matrix": matrix, "raw": corr}
