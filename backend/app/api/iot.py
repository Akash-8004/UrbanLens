import asyncio
import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.config import settings
from app.core.io_artifacts import read_json
from iot.esp32_simulator import latest_reading, history
from iot.store import query_history

router = APIRouter(prefix="/iot", tags=["iot"])


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
