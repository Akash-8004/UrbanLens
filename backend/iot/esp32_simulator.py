import math
import threading
from datetime import datetime, timezone

import numpy as np

from app.config import settings
from iot.store import insert_reading

_tick = 0
_lock = threading.Lock()
NODE = "node1"
LAT, LON = 19.07, 72.88


def _diurnal(tick: int):
    hour = (tick // 720) % 24 + (tick % 720) / 720 * 24 % 1
    h = (tick * settings.IOT_SSE_INTERVAL_S / 3600) % 24
    temp = 30.5 + 4.2 * math.sin((h - 14) * math.pi / 12)
    lux = max(0, 800 * math.sin(max(0, h - 6) * math.pi / 12))
    rh = 78 - 1.2 * (temp - 30)
    return temp, rh, lux


def latest_reading():
    global _tick
    with _lock:
        t = _tick
    temp, rh, lux = _diurnal(t)
    return {
        "node_id": NODE,
        "ts": datetime.now(timezone.utc).isoformat(),
        "temp_c": round(temp + np.random.default_rng(42 + t).normal(0, 0.15), 2),
        "humidity_pct": round(rh, 1),
        "lux_proxy": round(lux, 1),
        "battery": 92.0,
        "rssi": -58,
        "status": "ok",
        "mode": "simulated",
        "lat": LAT,
        "lon": LON,
    }


def history(hours: int = 24):
    pts = []
    steps = min(200, hours * 3600 // int(settings.IOT_SSE_INTERVAL_S))
    for i in range(steps):
        temp, rh, lux = _diurnal(i)
        pts.append({"ts": datetime.now(timezone.utc).isoformat(), "temp_c": temp, "humidity_pct": rh, "lux_proxy": lux})
    return pts


def _loop():
    global _tick
    while True:
        r = latest_reading()
        insert_reading(r["node_id"], r["ts"], r["temp_c"], r["humidity_pct"], r["lux_proxy"], r.get("rssi", -55))
        with _lock:
            _tick += 1
        threading.Event().wait(settings.IOT_SSE_INTERVAL_S)


def start_background():
    th = threading.Thread(target=_loop, daemon=True, name="iot-sim")
    th.start()
