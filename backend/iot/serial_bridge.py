"""Forward DHT11 readings from the ESP32's USB serial port into the UrbanLens API.

Run it alongside the API, with the board plugged in:

    python -m iot.serial_bridge                 # auto-detect the port
    python -m iot.serial_bridge --list          # show available ports
    python -m iot.serial_bridge --port COM5     # pick one explicitly

The ESP32 sketch prints one JSON object per line; each is POSTed to
/api/iot/ingest. Lines beginning with '#' are treated as board log output and
echoed, not parsed. The bridge keeps retrying if the board is unplugged, so it
can be started before the hardware is connected.
"""
from __future__ import annotations

import argparse
import json
import sys
import time

try:
    import serial
    from serial.tools import list_ports
except ImportError:  # pragma: no cover - dependency hint
    print("pyserial is not installed. Run: python -m pip install pyserial")
    raise SystemExit(1)

import httpx

DEFAULT_API = "http://127.0.0.1:8000"
# USB-serial chips used on ESP32 dev boards.
LIKELY_HINTS = ("CP210", "CH340", "CH910", "FTDI", "Silicon Labs", "USB-SERIAL", "USB Serial")


def available_ports() -> list:
    return list(list_ports.comports())


def print_ports() -> None:
    ports = available_ports()
    if not ports:
        print("No serial ports found. Plug in the ESP32 with a DATA micro-USB cable.")
        return
    print("Available serial ports:")
    for p in ports:
        print(f"  {p.device:<10} {p.description}")


def autodetect_port() -> str | None:
    ports = available_ports()
    for p in ports:
        blob = f"{p.description} {p.manufacturer or ''}".upper()
        if any(h.upper() in blob for h in LIKELY_HINTS):
            return p.device
    # Fall back to the only port present, if there is exactly one.
    if len(ports) == 1:
        return ports[0].device
    return None


def post_reading(client: httpx.Client, api: str, payload: dict) -> bool:
    body = {
        "node_id": payload.get("node_id", "node1"),
        "temp_c": payload["temp_c"],
        "humidity_pct": payload["humidity_pct"],
        "source": payload.get("source", "esp32-dht11-serial"),
    }
    if payload.get("lux_proxy") is not None:
        body["lux_proxy"] = payload["lux_proxy"]
    if payload.get("rssi") is not None:
        body["rssi"] = payload["rssi"]
    try:
        r = client.post(f"{api}/api/iot/ingest", json=body, timeout=4.0)
    except httpx.HTTPError as exc:
        print(f"  ! API unreachable at {api} ({exc.__class__.__name__}). Is the backend running?")
        return False
    if r.status_code >= 400:
        print(f"  ! API rejected the reading ({r.status_code}): {r.text[:200]}")
        return False
    return True


def pump(port: str, baud: int, api: str) -> None:
    """Read lines from the board until it disconnects."""
    sent = 0
    with serial.Serial(port, baud, timeout=2) as ser, httpx.Client() as client:
        print(f"Connected to {port} at {baud} baud. Forwarding to {api}/api/iot/ingest")
        print("Breathe on the sensor to make the numbers move. Ctrl+C to stop.\n")
        # Give the board a moment; it reboots when the port opens.
        time.sleep(0.5)
        while True:
            raw = ser.readline()
            if not raw:
                continue
            line = raw.decode("utf-8", errors="replace").strip()
            if not line:
                continue
            if line.startswith("#"):
                print(f"  [board] {line.lstrip('# ').strip()}")
                continue
            if not line.startswith("{"):
                print(f"  [board] {line}")
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                print(f"  ? unparsed: {line[:120]}")
                continue
            if "temp_c" not in payload or "humidity_pct" not in payload:
                print(f"  ? missing fields: {line[:120]}")
                continue
            if post_reading(client, api, payload):
                sent += 1
                print(
                    f"  -> {payload['temp_c']:.1f} C  {payload['humidity_pct']:.1f} %RH"
                    f"   (sent {sent})"
                )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--port", help="Serial port, e.g. COM5 (default: auto-detect)")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--api", default=DEFAULT_API, help=f"API base URL (default {DEFAULT_API})")
    ap.add_argument("--list", action="store_true", help="List serial ports and exit")
    args = ap.parse_args()

    if args.list:
        print_ports()
        return 0

    while True:
        port = args.port or autodetect_port()
        if not port:
            print("Waiting for the ESP32... (no candidate serial port yet)")
            print_ports()
            time.sleep(3)
            continue
        try:
            pump(port, args.baud, args.api)
        except KeyboardInterrupt:
            print("\nStopped.")
            return 0
        except serial.SerialException as exc:
            print(f"Serial error on {port}: {exc}")
            print("Retrying in 3s - check the cable, or close the Arduino IDE Serial Monitor.")
            time.sleep(3)


if __name__ == "__main__":
    sys.exit(main())
