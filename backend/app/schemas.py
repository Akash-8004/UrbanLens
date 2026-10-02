from typing import Any, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    demo_mode: bool
    artifacts_ready: bool


class Hotspot(BaseModel):
    id: str
    name: str
    class_: int = Field(alias="class")
    lat: float
    lon: float
    area_km2: float
    peak_lst: float
    top_drivers: list[str] = []

    model_config = {"populate_by_name": True}


class HeatmapResponse(BaseModel):
    image_png_b64: str
    width: int
    height: int
    bbox: list[float]
    layer: str
    classes: list[str] | None = None
    legend: list[dict[str, Any]] | None = None
    stats: dict[str, float]
    hotspots: list[dict[str, Any]] = []


class ForecastPoint(BaseModel):
    ts: str
    mean: float
    lower: float
    upper: float


class ForecastResponse(BaseModel):
    zone_id: str
    horizon_hours: list[int]
    series: dict[str, list[ForecastPoint]]
    metrics: dict[str, Any]


class OptimizeRequest(BaseModel):
    zone_id: str = "citywide"
    budget: float = 50.0
    weights: dict[str, float] = Field(default_factory=lambda: {"cooling": 1.0, "cost": 0.5, "cobenefit": 0.3})


class IoTReading(BaseModel):
    node_id: str
    ts: str
    temp_c: float
    humidity_pct: float
    lux_proxy: float
    battery: float | None = None
    rssi: int | None = None
    status: str = "ok"
    mode: Literal["live", "simulated"] = "simulated"
