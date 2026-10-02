from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import drivers, export, forecast, heatmap, interventions, iot, meta
from app.config import settings
from iot.esp32_simulator import start_background


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_background()
    yield


app = FastAPI(title="UrbanLens API", version="0.1.0", lifespan=lifespan)
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(meta.router, prefix="/api")
app.include_router(heatmap.router, prefix="/api")
app.include_router(drivers.router, prefix="/api")
app.include_router(forecast.router, prefix="/api")
app.include_router(interventions.router, prefix="/api")
app.include_router(iot.router, prefix="/api")
app.include_router(export.router, prefix="/api")


@app.get("/api/health")
def api_health():
    return meta.health()


@app.get("/api/pinn/metrics")
def pinn_metrics():
    from app.core.io_artifacts import read_json

    m = read_json("pinn_metrics")
    return {
        "physics_residual_wm2": m.get("residual_w_m2", {}).get("physics"),
        "ablation_residual_wm2": m.get("residual_w_m2", {}).get("ablation"),
        "ood_improvement_pct": m.get("ood_improvement_pct"),
        "rmse": m.get("rmse"),
        "ood_rmse": m.get("ood_rmse"),
        "chart": [
            {"label": "Energy residual", "with_physics": m.get("residual_w_m2", {}).get("physics", 0), "without_physics": m.get("residual_w_m2", {}).get("ablation", 0)},
            {"label": "OOD RMSE", "with_physics": m.get("ood_rmse", {}).get("physics", 0), "without_physics": m.get("ood_rmse", {}).get("ablation", 0)},
        ],
        **m,
    }
