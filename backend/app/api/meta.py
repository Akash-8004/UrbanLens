from fastapi import APIRouter

from app.config import settings
from app.core.io_artifacts import artifact_path, read_json
from app.schemas import HealthResponse

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/health", include_in_schema=False)
def health_alias():
    return health()


def health():
    ready = artifact_path("heatmap.json").exists()
    return HealthResponse(status="ok", demo_mode=settings.DEMO_MODE, artifacts_ready=ready)


@router.get("/provenance")
def provenance():
    p = read_json("provenance")
    sources = p.get("sources") or []
    for s in sources:
        s.setdefault("timestamp", p.get("generated_at"))
        s.setdefault("resolution", "30m")
    return {
        "sources": sources,
        "global_synthetic": p.get("synthetic", True),
        "demo_mode": p.get("demo_mode", True),
        "seed": p.get("seed"),
        "generated_at": p.get("generated_at"),
    }


@router.get("/models")
def models():
    return read_json("model_registry")


@router.get("/zones")
def zones():
    z = read_json("zones")
    out = []
    for f in z.get("features", []):
        p = f.get("properties", {})
        c = p.get("centroid") or [72.89, 19.05]
        # Tight visual bounds around centroid (Voronoi masks can span the whole bbox)
        pad_lon, pad_lat = 0.025, 0.02
        bounds = [c[0] - pad_lon, c[1] - pad_lat, c[0] + pad_lon, c[1] + pad_lat]
        out.append({
            "id": f.get("id"),
            "name": p.get("name"),
            "bounds": bounds,
            "centroid": c,
            "area_km2": p.get("area_km2"),
            "population_proxy": int(p.get("area_km2", 1) * 15000),
        })
    return {"zones": out}
