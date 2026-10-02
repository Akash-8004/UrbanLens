import sqlite3
from datetime import datetime, timedelta, timezone

from app.config import settings


def _conn():
    settings.IOT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(settings.IOT_DB_PATH)
    c.execute(
        """CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id TEXT, ts TEXT, temp_c REAL, humidity_pct REAL, lux_proxy REAL, rssi INTEGER)"""
    )
    return c


def insert_reading(node_id, ts, temp_c, humidity_pct, lux_proxy, rssi=-55):
    with _conn() as c:
        c.execute(
            "INSERT INTO readings (node_id, ts, temp_c, humidity_pct, lux_proxy, rssi) VALUES (?,?,?,?,?,?)",
            (node_id, ts, temp_c, humidity_pct, lux_proxy, rssi),
        )


def query_history(node_id: str, hours: int):
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    with _conn() as c:
        rows = c.execute(
            "SELECT ts, temp_c, humidity_pct, lux_proxy, rssi FROM readings WHERE node_id=? AND ts>=? ORDER BY ts",
            (node_id, since),
        ).fetchall()
    return [{"ts": r[0], "temp_c": r[1], "humidity_pct": r[2], "lux_proxy": r[3], "rssi": r[4]} for r in rows]
