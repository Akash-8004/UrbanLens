# Hardware demo runbook — ESP32 + DHT11 live node

Written for the external presentation. Follow it top to bottom; allow **30–40 minutes**
the first time, mostly Arduino IDE installation.

Parts used: ESP32 Dev Board (ESP-WROOM-32), DHT11 3-pin module, 400-point breadboard,
male-to-female jumper wires, micro-USB **data** cable.

---

## 1. Wiring (3 wires, no resistor needed)

The 3-pin DHT11 module has its pull-up resistor built onto the board, so the sensor
connects directly. Use male-to-female jumpers: female end onto the module pins, male
end into the ESP32 header (or the breadboard row the ESP32 sits in).

| DHT11 module pin | Goes to ESP32 pin | Wire |
|---|---|---|
| `VCC` / `+` / `3.3V` | `3V3` | red |
| `DATA` / `OUT` / `S` | `GPIO 4` (labelled `D4`) | yellow |
| `GND` / `-` | `GND` | black |

```
  DHT11 module                 ESP32 (ESP-WROOM-32)
  +----------------+           +--------------------+
  |  +   OUT   -   |           |                    |
  +--|----|----|---+           |  3V3   GPIO4   GND |
     |    |    |               +---|------|------|--+
     |    |    +-------- black ----(------(------+
     |    +------------- yellow ---(------+
     +------------------ red ------+
```

Checks before powering up:
- **Use `3V3`, not `5V`.** The module is rated for 3.3 V on the ESP32 and the data
  line must not exceed the ESP32's 3.3 V logic level.
- Confirm the middle pin really is data — some modules order the pins
  `GND / DATA / VCC`. **Read the silkscreen on your module**, don't assume.
- If the ESP32 straddles the breadboard and covers every free row, skip the
  breadboard and plug the female jumper ends straight onto the ESP32 header pins.

---

## 2. One-time software setup

1. Install the **Arduino IDE** (2.x) — https://www.arduino.cc/en/software
2. Add ESP32 board support: **File → Preferences → Additional boards manager URLs**, paste:
   ```
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
   Then **Tools → Board → Boards Manager**, search `esp32`, install **esp32 by Espressif Systems**.
3. **Tools → Manage Libraries**, install:
   - `DHT sensor library` (Adafruit)
   - `Adafruit Unified Sensor` (prompted as a dependency — accept it)
4. Install the USB-serial driver if the board does not appear as a COM port:
   CP2102 boards → Silicon Labs VCP driver; CH340 boards → CH341SER driver.

---

## 3. Flash the board

1. Plug the ESP32 in with the micro-USB **data** cable (a charge-only cable will power
   the board but never appear as a COM port).
2. Open `hardware/urbanlens_node_serial/urbanlens_node_serial.ino`.
3. **Tools → Board → ESP32 Arduino → ESP32 Dev Module**.
4. **Tools → Port →** pick the COM port that appeared (e.g. `COM5`).
5. Click **Upload**. If it stalls at `Connecting........`, hold the **BOOT** button
   while it connects, then release.
6. Open **Tools → Serial Monitor** at **115200 baud**. You should see one line every 2 s:
   ```
   {"node_id":"node1","temp_c":30.0,"humidity_pct":62.0,"seq":4,"source":"esp32-dht11-serial"}
   ```
7. **Close the Serial Monitor.** Only one program can hold the COM port, and the
   bridge needs it next.

---

## 4. Run the demo (three terminals)

From the project root, `C:\Users\Admin\Desktop\LOCAL\ProjectUrban`:

```powershell
# Terminal A — backend API
python scripts/dev.py

# Terminal B — serial bridge (ESP32 -> API)
$env:PYTHONPATH="$PWD\backend"; python -m iot.serial_bridge

# Terminal C — dashboard
cd frontend; npm run dev
```

The bridge auto-detects the port. If it cannot, run `python -m iot.serial_bridge --list`
and pass it explicitly: `python -m iot.serial_bridge --port COM5`.

Bridge output when it is working:

```
Connected to COM5 at 115200 baud. Forwarding to http://127.0.0.1:8000/api/iot/ingest
  -> 30.0 C  62.0 %RH   (sent 1)
  -> 30.0 C  63.0 %RH   (sent 2)
```

Open **http://localhost:5173/sensors**. The badge next to "Live IoT feed" should read
**LIVE HARDWARE · ESP32 + DHT11** in green, with a rising reading count.

Optional, for a clean chart: delete `data/iot/readings.db` *before* starting the API so
the history sparkline contains only tonight's real readings.

---

## 5. What to show and say

1. **Point at the green badge.** "The dashboard is reading our physical node, not the
   simulator. If I unplug the board it falls back to simulated data within 30 seconds
   and the badge turns amber."
2. **Breathe on the DHT11.** Temperature and humidity both climb within ~4 seconds —
   the gauge, the number and the sparkline all move. This is the moment that proves it
   is live; nothing in a recording does that.
3. **Unplug the USB cable.** After ~30 s the badge flips to amber "Simulated". Plug it
   back in and it returns to green. This demonstrates the staleness fallback is
   deliberate engineering, not a crash.
4. **Open http://localhost:8000/docs** and show `POST /api/iot/ingest`. Explain that
   the transport is interchangeable: the serial bridge posts to the same endpoint the
   ESP32 hits directly over WiFi (`hardware/urbanlens_node_wifi/`), and the MQTT
   subscriber in `backend/iot/mqtt_subscriber.py` is the third option.

### Be honest about scope — it earns marks rather than losing them

- **One node, not a network.** It validates the pipeline end to end; a deployed system
  needs many nodes for spatial coverage.
- **No light sensor.** You have no LDR, so `lux_proxy` is reported as `null`, not faked.
  Say this plainly if asked about the field.
- **DHT11 measures air temperature; the satellite layer is land surface temperature.**
  They are different physical quantities, which is exactly why the Sensors page shows a
  bias comparison rather than expecting the two to match. LST runs several degrees above
  air temperature over dry urban surfaces in the afternoon.
- **DHT11 accuracy is ±2 °C, ±5 % RH**, with 1-unit resolution. It is a teaching-grade
  sensor; the architecture, not this sensor, is the contribution.

---

## 6. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| No COM port in Arduino IDE | Charge-only USB cable, or missing CP2102/CH340 driver. Try another cable first. |
| Upload stalls at `Connecting....` | Hold **BOOT** during connect; try a different USB port; close any Serial Monitor. |
| `# read failed` every 2 s | DATA not on GPIO 4, loose jumper, or module wired to 5 V. Reseat all three wires. |
| Serial Monitor prints nothing | Baud is not 115200, or the bridge already owns the port. |
| Bridge: `could not open port ... Access is denied` | Arduino Serial Monitor is still open. Close it. |
| Bridge: `API unreachable` | Terminal A is not running, or it is bound to a different port. |
| Badge stays amber while the bridge prints `-> ...` | Browser is on a cached page — hard-refresh with Ctrl+Shift+R. |
| Temperature reads a flat whole number | Normal: DHT11 resolution is 1 °C. Breathing on it still moves the value. |
| WiFi sketch: `POST -1` | `API_HOST` is wrong or the API is bound to `127.0.0.1`. Use the laptop's LAN IP and start uvicorn with `--host 0.0.0.0`. |

### If the hardware fails during the presentation

Pull the USB cable and keep going. The dashboard falls back to the simulator on its own,
and every other page (heat map, drivers, forecast, optimizer) is unaffected. Say: "the
node has dropped out, so the feed has fallen back to simulated data — the fallback you
just saw is the designed behaviour." A graceful degradation you can narrate reads far
better than a frozen screen.
