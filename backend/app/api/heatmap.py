from fastapi import APIRouter, HTTPException

from app.config import settings
from app.core.io_artifacts import read_json

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
        from app.config import settings
        bp = settings.ARTIFACTS_DIR / "buildings.geojson"
        if bp.exists():
            buildings = json.loads(bp.read_text(encoding="utf-8"))
    except Exception:
        buildings = None
    return {
        "image_png_b64": layers[key],
        "width": data["width"],
        "height": data["height"],
        "bbox": data["bbox"],
        "layer": layer,
        "classes": data.get("classes"),
        "legend": data.get("legend"),
        "stats": data.get("stats", {}),
        "hotspots": data.get("hotspots", []),
        "buildings_geojson": buildings,
        "iot_node": {"lat": 19.07, "lon": 72.88, "node_id": "node1"},
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
