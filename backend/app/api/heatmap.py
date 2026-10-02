from fastapi import APIRouter, HTTPException

from app.config import settings
from app.core.io_artifacts import read_json
from app.core.hotspots import build_hotspot_layers

router = APIRouter(prefix="/heatmap", tags=["heatmap"])
LAYERS = ("heat_stress", "lst", "ndvi", "ndbi", "svf", "impervious", "drivers")


@router.get("")
def get_heatmap(layer: str = "heat_stress"):
    if layer not in LAYERS and layer != "drivers":
        raise HTTPException(400, f"layer must be one of {LAYERS}")
    data = read_json("heatmap")
    layers = data.get("layers") or read_json("heatmap_pngs")
    key = "heat_stress" if layer == "drivers" else layer
    if key not in layers:
        key = "lst"
    buildings = None
    try:
        import json
        bp = settings.ARTIFACTS_DIR / "buildings.geojson"
        if bp.exists():
            buildings = json.loads(bp.read_text(encoding="utf-8"))
    except Exception:
        buildings = None

    zones_fc = read_json("zones")
    try:
        zone_summary = read_json("zone_summary")
    except FileNotFoundError:
        zone_summary = {}
    try:
        drivers_z = read_json("drivers_zones")
        insights = drivers_z.get("insights") or {}
        for zid, insight in insights.items():
            if zid in zone_summary:
                zone_summary[zid]["insight"] = insight
            # also attach top drivers if missing
            ranked = (drivers_z.get("zones") or {}).get(zid) or []
            if zid in zone_summary and not zone_summary[zid].get("top_drivers"):
                zone_summary[zid]["top_drivers"] = [d["feature"] for d in ranked[:3]]
    except FileNotFoundError:
        pass

    hotspots, hotspots_geojson = build_hotspot_layers(
        data.get("hotspots", []),
        zones_fc,
        zone_summary,
        data.get("stats") or {},
    )

    return {
        "image_png_b64": layers[key],
        "width": data["width"],
        "height": data["height"],
        "bbox": data["bbox"],
        "layer": layer,
        "classes": data.get("classes"),
        "legend": data.get("legend"),
        "stats": data.get("stats", {}),
        "hotspots": hotspots,
        "hotspots_geojson": hotspots_geojson,
        "buildings_geojson": buildings,
        "iot_node": {"lat": 19.07, "lon": 72.88, "node_id": "node1"},
        "study_label": "Mumbai · Andheri–Kurla corridor",
        "nation_center": [78.96, 22.5],
    }


@router.get("/zones/{zone_id}")
def zone_detail(zone_id: str):
    zs = read_json("zone_summary")
    if zone_id not in zs:
        raise HTTPException(404, "zone not found")
    return zs[zone_id]


@router.get("/toggle/{class_id}")
def class_mask(class_id: int):
    zones = read_json("zones")
    return {"class_id": class_id, "type": "FeatureCollection", "features": zones.get("features", [])}
