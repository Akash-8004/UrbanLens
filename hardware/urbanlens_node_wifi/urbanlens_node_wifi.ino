/*
 * UrbanLens ground-truth node - WiFi transport (optional).
 *
 * Posts DHT11 readings straight to POST /api/iot/ingest over WiFi, with no host
 * bridge process. Nicer to show, but it depends on the network: use the serial
 * sketch for the graded demo and keep this as the "we also did it wirelessly"
 * follow-up.
 *
 * Before flashing, set WIFI_SSID, WIFI_PASS and API_HOST below.
 * API_HOST must be the LAN IP of the laptop running the backend (ipconfig ->
 * IPv4 Address), NOT 127.0.0.1, and the laptop must be on the same network.
 * Start the API bound to all interfaces so the board can reach it:
 *     uvicorn app.main:app --host 0.0.0.0 --port 8000
 *
 * Board:   ESP32 Dev Module  (ESP-WROOM-32)
 * Library: "DHT sensor library" by Adafruit (+ "Adafruit Unified Sensor")
 *
 * Wiring is identical to the serial sketch:
 *   module VCC -> 3V3, module DATA -> GPIO 4, module GND -> GND
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"

const char *WIFI_SSID = "YOUR_WIFI_OR_HOTSPOT";
const char *WIFI_PASS = "YOUR_PASSWORD";
const char *API_HOST  = "192.168.1.100";   // laptop LAN IP
const int   API_PORT  = 8000;

#define DHT_PIN   4
#define DHT_TYPE  DHT11

const unsigned long SAMPLE_INTERVAL_MS = 2000;
const char *NODE_ID = "node1";

DHT dht(DHT_PIN, DHT_TYPE);
unsigned long lastSample = 0;
unsigned long okCount = 0;

void connectWifi() {
  Serial.print("# connecting to ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("# connected, board IP ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("# WiFi failed - check SSID/password, and use a 2.4 GHz network");
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  dht.begin();
  connectWifi();
}

void loop() {
  unsigned long now = millis();
  if (now - lastSample < SAMPLE_INTERVAL_MS) {
    return;
  }
  lastSample = now;

  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
    return;
  }

  float humidity = dht.readHumidity();
  float tempC = dht.readTemperature();
  if (isnan(humidity) || isnan(tempC)) {
    Serial.println("# DHT11 read failed - check DATA on GPIO 4 and 3V3 power");
    return;
  }
  okCount++;

  String url = String("http://") + API_HOST + ":" + API_PORT + "/api/iot/ingest";
  String body = String("{\"node_id\":\"") + NODE_ID +
                "\",\"temp_c\":" + String(tempC, 1) +
                ",\"humidity_pct\":" + String(humidity, 1) +
                ",\"rssi\":" + String(WiFi.RSSI()) +
                ",\"source\":\"esp32-dht11-wifi\"}";

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  Serial.print("# POST ");
  Serial.print(code);
  Serial.print("  ");
  Serial.print(tempC, 1);
  Serial.print("C ");
  Serial.print(humidity, 1);
  Serial.println("%RH");
  if (code <= 0) {
    Serial.print("# transport error: ");
    Serial.println(http.errorToString(code));
  }
  http.end();
}
