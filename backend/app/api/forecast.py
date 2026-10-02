from fastapi import APIRouter, HTTPException

from app.core.io_artifacts import read_json

router = APIRouter(prefix="/forecast", tags=["forecast"])


def _flatten_zone_series(series_by_h: dict) -> list:
    """Pick longest horizon curve, map mean→value for frontend charts."""
    if not series_by_h:
        return []
    # prefer 48h then longest
    key = "48" if "48" in series_by_h else max(series_by_h.keys(), key=lambda k: len(series_by_h.get(k) or []))
    pts = series_by_h.get(key) or []
    out = []
    for p in pts:
        out.append({
            "ts": p.get("ts"),
            "value": float(p.get("mean", p.get("value", 0))),
            "pi_lower": float(p.get("lower", p.get("pi_lower", 0))),
            "pi_upper": float(p.get("upper", p.get("pi_upper", 0))),
        })
    return out


def _horizon_cards(series_by_h: dict) -> dict:
    cards = {}
    for h in ("6", "12", "24", "48"):
        pts = series_by_h.get(h) or []
        if not pts:
            continue
        last = pts[-1]
        cards[h] = {
            "value": float(last.get("mean", 0)),
            "pi_lower": float(last.get("lower", 0)),
            "pi_upper": float(last.get("upper", 0)),
        }
    return cards


def _flat_metrics(m: dict) -> dict:
    """Collapse per-horizon metrics to single headline numbers."""
    if not m:
        return {}
    rmses, maes, skills = [], [], []
    for _h, v in m.items():
        if isinstance(v, dict):
            if "rmse" in v:
                rmses.append(v["rmse"])
            if "mae" in v:
                maes.append(v["mae"])
            if "skill_vs_persistence" in v:
                skills.append(v["skill_vs_persistence"])
    return {
        "rmse": sum(rmses) / len(rmses) if rmses else 0,
        "mae": sum(maes) / len(maes) if maes else 0,
        "skill": sum(skills) / len(skills) if skills else 0,
        "by_horizon": m,
    }


@router.get("")
def forecast(zone_id: str = "kurla", horizon: str = "all"):
    fc = read_json("forecast")
    if zone_id not in fc.get("series", {}):
        # try first available
        keys = list(fc.get("series", {}).keys())
        if not keys:
            raise HTTPException(404, "zone not found")
        zone_id = keys[0]
    series_by_h = fc["series"][zone_id]
    if horizon != "all" and horizon in series_by_h:
        series_by_h = {horizon: series_by_h[horizon]}
    return {
        "zone_id": zone_id,
        "horizon_hours": fc["horizons"],
        "series": _flatten_zone_series(series_by_h),
        "series_by_horizon": series_by_h,
        "horizons": _horizon_cards(fc["series"][zone_id]),
        "metrics": _flat_metrics(fc["metrics"].get(zone_id, {})),
    }


@router.get("/citywide")
def forecast_citywide():
    fc = read_json("forecast")
    zs = read_json("zone_summary")
    # average the 48h curves across zones
    curves = []
    for zid, by_h in fc["series"].items():
        flat = _flatten_zone_series(by_h)
        if flat:
            curves.append(flat)
    series = []
    if curves:
        n = min(len(c) for c in curves)
        for i in range(n):
            series.append({
                "ts": curves[0][i]["ts"],
                "value": sum(c[i]["value"] for c in curves) / len(curves),
                "pi_lower": sum(c[i].get("pi_lower", 0) for c in curves) / len(curves),
                "pi_upper": sum(c[i].get("pi_upper", 0) for c in curves) / len(curves),
            })
    agg = {}
    for h in map(str, fc["horizons"]):
        means = []
        for zid, by_h in fc["series"].items():
            if h in by_h and by_h[h]:
                means.append(by_h[h][-1]["mean"])
        agg[h] = {"mean_lst": sum(means) / len(means) if means else 0}
    return {
        "zone_id": "citywide",
        "series": series,
        "horizons": {h: {"value": v["mean_lst"]} for h, v in agg.items()},
        "aggregate": agg,
        "zones": list(zs.keys()),
    }
