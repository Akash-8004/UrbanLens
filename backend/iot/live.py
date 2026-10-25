"""Live hardware readings pushed in by POST /api/iot/ingest.

Either transport can feed this: the USB serial bridge (iot/serial_bridge.py) or the
ESP32 posting over WiFi. If no hardware reading arrives within LIVE_TTL_S the getters
report "not live" and the API falls back to the simulator, so the dashboard keeps
working when the board is unplugged mid-demo.
"""
from __future__ import annotations

import threading
import time
from datetime import datetime, timezone

# A reading older than this is considered stale; the board sends every ~2 s.
LIVE_TTL_S = 30.0

_lock = threading.Lock()
_latest: dict | None = None
_received = 0
_first_ts: str | None = None


def push_reading(
    node_id: str,
    temp_c: float,
    humidity_pct: float,
    lux_proxy: float | None = None,
    rssi: int | None = None,
    source: str = "hardware",
) -> dict:
    """Record one reading from the physical node and return the stored form."""
    global _latest, _received, _first_ts
    reading = {
        "node_id": node_id,
        "ts": datetime.now(timezone.utc).isoformat(),
        "temp_c": round(float(temp_c), 2),
        "humidity_pct": round(float(humidity_pct), 1),
        # No LDR on the current node, so this stays null rather than being invented.
        "lux_proxy": None if lux_proxy is None else round(float(lux_proxy), 1),
        "rssi": rssi,
        "status": "ok",
        "mode": "live-hardware",
        "source": source,
        "sensor": "DHT11",
    }
    with _lock:
        _latest = {**reading, "_recv_monotonic": time.monotonic()}
        _received += 1
        if _first_ts is None:
            _first_ts = reading["ts"]
    return reading


def get_live() -> dict | None:
    """Newest hardware reading, or None when nothing fresh has arrived."""
    with _lock:
        stored = _latest
    if not stored:
        return None
    if time.monotonic() - stored["_recv_monotonic"] > LIVE_TTL_S:
        return None
    return {k: v for k, v in stored.items() if k != "_recv_monotonic"}


def is_live() -> bool:
    return get_live() is not None


def status() -> dict:
    with _lock:
        received, first = _received, _first_ts
    live = get_live()
    return {
        "live": live is not None,
        "readings_received": received,
        "first_reading_ts": first,
        "last_reading_ts": live["ts"] if live else None,
        "ttl_seconds": LIVE_TTL_S,
        "mode": "live-hardware" if live else "simulated",
    }
