FIRMWARE = '''
# MicroPython — ESP32 + DHT11 (GPIO4) + LDR (ADC)
# Flash: esptool + micropython firmware; upload this as main.py
# MQTT topic: urbanlens/node1  every 300s

from machine import Pin, ADC
import dht, network, time, json
from umqtt.simple import MQTTClient

WIFI_SSID = "YOUR_SSID"
WIFI_PASS = "YOUR_PASS"
BROKER = "192.168.1.10"
TOPIC = b"urbanlens/node1"

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        wlan.connect(WIFI_SSID, WIFI_PASS)
        for _ in range(20):
            if wlan.isconnected():
                break
            time.sleep(0.5)
    return wlan

d = dht.DHT11(Pin(4))
ldr = ADC(Pin(34))
client = None

def read():
    d.measure()
    return {"node_id": "node1", "ts": time.time(), "temp_c": d.temperature(),
            "humidity_pct": d.humidity(), "lux_proxy": ldr.read(), "rssi": network.WLAN(network.STA_IF).status()}

while True:
    try:
        connect_wifi()
        if client is None:
            client = MQTTClient("urbanlens-esp", BROKER)
            client.connect()
        client.publish(TOPIC, json.dumps(read()))
    except Exception:
        client = None
        time.sleep(5)
    time.sleep(300)
'''
