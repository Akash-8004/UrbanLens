"""Optional MQTT ingest — requires paho-mqtt in requirements-heavy.txt."""
try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None

from app.config import settings
from iot.store import insert_reading


def on_message(_c, _u, msg):
    import json

    data = json.loads(msg.payload)
    insert_reading(data["node_id"], data.get("ts", ""), data["temp_c"], data["humidity_pct"], data.get("lux_proxy", 0), data.get("rssi", -60))


def run():
    if mqtt is None:
        raise RuntimeError("paho-mqtt not installed")
    client = mqtt.Client()
    client.on_message = on_message
    client.connect(settings.MQTT_HOST, settings.MQTT_PORT)
    client.subscribe("urbanlens/#")
    client.loop_forever()


if __name__ == "__main__":
    run()
