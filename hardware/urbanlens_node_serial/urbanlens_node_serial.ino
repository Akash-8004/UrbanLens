/*
 * UrbanLens ground-truth node - USB serial transport.
 *
 * Reads the DHT11 and prints one JSON object per line. The host-side bridge
 * (backend/iot/serial_bridge.py) forwards each line to POST /api/iot/ingest.
 *
 * Use this version for the live demo: no WiFi, no broker, nothing that can fail
 * on an unfamiliar network.
 *
 * Board:   ESP32 Dev Module  (ESP-WROOM-32)
 * Library: "DHT sensor library" by Adafruit (+ "Adafruit Unified Sensor")
 *
 * Wiring - DHT11 3-pin module to ESP32:
 *   module VCC / + / S-side power  -> ESP32 3V3
 *   module DATA / OUT / S          -> ESP32 GPIO 4
 *   module GND / -                 -> ESP32 GND
 * The 3-pin module has its own pull-up resistor, so no extra parts are needed.
 */

#include "DHT.h"

#define DHT_PIN   4
#define DHT_TYPE  DHT11

// DHT11 cannot be polled faster than about once per second.
const unsigned long SAMPLE_INTERVAL_MS = 2000;
const char *NODE_ID = "node1";

DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastSample = 0;
unsigned long okCount = 0;
unsigned long failCount = 0;

void setup() {
  Serial.begin(115200);
  delay(200);
  dht.begin();
  // Lines starting with '#' are treated as comments by the bridge.
  Serial.println("# UrbanLens node booting");
  Serial.print("# sensor=DHT11 pin=");
  Serial.println(DHT_PIN);
}

void loop() {
  unsigned long now = millis();
  if (now - lastSample < SAMPLE_INTERVAL_MS) {
    return;
  }
  lastSample = now;

  float humidity = dht.readHumidity();
  float tempC = dht.readTemperature();

  if (isnan(humidity) || isnan(tempC)) {
    failCount++;
    Serial.print("# read failed (check DATA on GPIO ");
    Serial.print(DHT_PIN);
    Serial.print(" and 3V3 power), fails=");
    Serial.println(failCount);
    return;
  }

  okCount++;

  // One compact JSON object per line - this is what the bridge parses.
  Serial.print("{\"node_id\":\"");
  Serial.print(NODE_ID);
  Serial.print("\",\"temp_c\":");
  Serial.print(tempC, 1);
  Serial.print(",\"humidity_pct\":");
  Serial.print(humidity, 1);
  Serial.print(",\"seq\":");
  Serial.print(okCount);
  Serial.println(",\"source\":\"esp32-dht11-serial\"}");
}
