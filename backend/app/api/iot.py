import asyncio
import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.core.io_artifacts import read_json
from iot.esp32_simulator import latest_reading, history
from iot import live
from iot.store import insert_reading, query_history

router = APIRouter(prefix="/iot", tags=["iot"])


class IngestReading(BaseModel):
    """One reading from the physical ESP32 + DHT11 node."""

    node_id: str = "node1"
    temp_c: float = Field(..., ge=-40, le=85, description="DHT11 operating range")
    humidity_pct: float = Field(..., ge=0, le=100)
    lux_proxy: float | None = None
    rssi: int | None = None
    source: str = "hardware"


@router.post("/ingest")
def iot_ingest(reading: IngestReading):
    """Accept a live reading from the serial bridge or from the ESP32 over WiFi."""
    stored = live.push_reading(
        node_id=reading.node_id,
        temp_c=reading.temp_c,
        humidity_pct=reading.humidity_pct,
        lux_proxy=reading.lux_proxy,
        rssi=reading.rssi,
        source=reading.source,
    )
    insert_reading(
        stored["node_id"], stored["ts"], stored["temp_c"],
        stored["humidity_pct"], stored["lux_proxy"], stored["rssi"] or -55,
    )
    return {"ok": True, "stored": stored}


@router.get("/status")
def iot_status():
    """Whether the dashboard is currently showing real hardware or the simulator."""
    return live.status()


@router.get("/latest")
def iot_latest():
    return latest_reading()


@router.get("/history")
def iot_history(hours: int = 24, node_id: str = "node1"):
    rows = query_history(node_id, hours)
    pts = rows if rows else history(hours)
    # normalize to readings[] for frontend
    readings = []
    for p in pts:
        readings.append({
            "node_id": node_id,
            "ts": p.get("ts"),
            "temp_c": p.get("temp_c"),
            "humidity_pct": p.get("humidity_pct"),
            "lux_proxy": p.get("lux_proxy"),
            "rssi": p.get("rssi"),
        })
    return {"node_id": node_id, "readings": readings, "points": readings}


@router.get("/validation")
def iot_validation():
    return read_json("iot_validation")


@router.get("/stream")
async def iot_stream(request: Request):
    async def gen():
        while True:
            if await request.is_disconnected():
                break
            r = latest_reading()
            yield f"data: {json.dumps(r)}\n\n"
            await asyncio.sleep(settings.IOT_SSE_INTERVAL_S)

    return StreamingResponse(gen(), media_type="text/event-stream")
