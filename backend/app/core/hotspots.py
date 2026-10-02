"""Street-level heat micro-spots — precise coords along Western Line roads/blocks."""
from __future__ import annotations

import math
from typing import Any

CLASS_COLORS = {
    0: "#3B82F6",
    1: "#22D3EE",
    2: "#F59E0B",
    3: "#EF4444",
}
CLASS_NAMES = ["Low", "Moderate", "High", "Extreme"]

LOCALITIES: list[dict[str, Any]] = [
    {"zone_id": "churchgate", "name": "Churchgate", "lat": 18.9350, "lon": 72.8272},
    {"zone_id": "dadar", "name": "Dadar", "lat": 19.0180, "lon": 72.8430},
    {"zone_id": "mahim", "name": "Mahim", "lat": 19.0350, "lon": 72.8400},
    {"zone_id": "bandra", "name": "Bandra", "lat": 19.0596, "lon": 72.8295},
    {"zone_id": "santacruz", "name": "Santacruz", "lat": 19.0810, "lon": 72.8410},
    {"zone_id": "andheri_w", "name": "Andheri West", "lat": 19.1197, "lon": 72.8464},
    {"zone_id": "andheri_e", "name": "Andheri East", "lat": 19.1136, "lon": 72.8697},
    {"zone_id": "jogeshwari", "name": "Jogeshwari", "lat": 19.1360, "lon": 72.8490},
    {"zone_id": "goregaon", "name": "Goregaon", "lat": 19.1663, "lon": 72.8526},
    {"zone_id": "malad", "name": "Malad", "lat": 19.1860, "lon": 72.8485},
    {"zone_id": "kandivali", "name": "Kandivali", "lat": 19.2040, "lon": 72.8520},
    {"zone_id": "borivali", "name": "Borivali", "lat": 19.2307, "lon": 72.8567},
    {"zone_id": "dahisar", "name": "Dahisar", "lat": 19.2570, "lon": 72.8650},
    {"zone_id": "mira_road", "name": "Mira Road", "lat": 19.2813, "lon": 72.8700},
    {"zone_id": "bhayandar", "name": "Bhayandar", "lat": 19.3010, "lon": 72.8510},
    {"zone_id": "naigaon", "name": "Naigaon", "lat": 19.3510, "lon": 72.8460},
    {"zone_id": "vasai", "name": "Vasai Road", "lat": 19.3820, "lon": 72.8320},
    {"zone_id": "nallasopara", "name": "Nallasopara", "lat": 19.4156, "lon": 72.8110},
    {"zone_id": "virar", "name": "Virar", "lat": 19.4550, "lon": 72.8110},
    {"zone_id": "saphale", "name": "Saphale", "lat": 19.5780, "lon": 72.7900},
    {"zone_id": "kelve", "name": "Kelve Road", "lat": 19.6280, "lon": 72.7820},
    {"zone_id": "palghar", "name": "Palghar", "lat": 19.6967, "lon": 72.7654},
    {"zone_id": "boisar", "name": "Boisar", "lat": 19.8030, "lon": 72.7560},
    {"zone_id": "kurla", "name": "Kurla", "lat": 19.0726, "lon": 72.8845},
    {"zone_id": "powai", "name": "Powai", "lat": 19.1170, "lon": 72.9050},
    {"zone_id": "chembur", "name": "Chembur", "lat": 19.0522, "lon": 72.9005},
]

WESTERN_LINE_SPOTS = LOCALITIES

ROAD_TEMPLATES = [
    "SV Road junction",
    "Link Road stretch",
    "Station east plaza",
    "Station west exit",
    "Flyover underside",
    "Bus depot apron",
    "Market lane",
    "Industrial shed row",
    "Parking lot roof cluster",
    "Metro shaft open cut",
    "Residential canyon block",
    "Petrol pump forecourt",
    "Railway track corridor",
    "Signal crossing",
    "Warehouse yard",
]


def _rng(seed: int):
    state = seed & 0xFFFFFFFF

    def nxt():
        nonlocal state
        state = (1664525 * state + 1013904223) & 0xFFFFFFFF
        return state / 0x100000000

    return nxt


def _hash(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h or 1


def class_from_peak(peak: float) -> int:
    if peak >= 48.0:
        return 3
    if peak >= 45.5:
        return 2
    if peak >= 43.0:
        return 1
    return 0


def _offset_m(lat: float, lon: float, east_m: float, north_m: float) -> tuple[float, float]:
    dlat = north_m / 111_320.0
    dlon = east_m / (111_320.0 * max(0.2, math.cos(math.radians(lat))))
    return lon + dlon, lat + dlat


def _micro_footprint(lon: float, lat: float, radius_m: float, seed: int, n: int = 28) -> list[list[float]]:
    rnd = _rng(seed)
    ring = []
    for i in range(n):
        a = 2 * math.pi * i / n
        r_m = radius_m * (0.72 + 0.35 * rnd() + 0.12 * math.sin(5 * a + seed))
        elon, elat = _offset_m(lat, lon, r_m * math.cos(a), r_m * math.sin(a))
        ring.append([elon, elat])
    ring.append(ring[0])
    return ring


def generate_micro_hotspots(per_locality: int = 8) -> list[dict[str, Any]]:
    spots: list[dict[str, Any]] = []
    for loc in LOCALITIES:
        rnd = _rng(_hash(loc["zone_id"]))
        n = per_locality + (2 if loc["zone_id"] in ("kurla", "andheri_e", "goregaon", "dadar") else 0)
        n = min(12, n)
        for k in range(n):
            along = (rnd() - 0.5) * 900
            across = (rnd() - 0.5) * 420
            if rnd() < 0.35:
                across *= 0.25
            lon, lat = _offset_m(loc["lat"], loc["lon"], across, along)
            peak = 40.5 + rnd() * 10.5
            if loc["zone_id"] in ("kurla", "andheri_e", "goregaon"):
                peak += 1.8
            peak = round(min(52.0, peak), 2)
            cls = class_from_peak(peak)
            road = ROAD_TEMPLATES[int(rnd() * len(ROAD_TEMPLATES)) % len(ROAD_TEMPLATES)]
            radius_m = 55 + cls * 28 + rnd() * 40
            intensity = round(0.35 + 0.65 * (peak - 40) / 12, 3)
            sid = f"hs_{loc['zone_id']}_{k}"
            spots.append({
                "id": sid,
                "zone_id": loc["zone_id"],
                "name": f"{loc['name']} - {road}",
                "locality": loc["name"],
                "road": road,
                "class": cls,
                "class_label": CLASS_NAMES[cls],
                "color": CLASS_COLORS[cls],
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "peak_lst": peak,
                "mean_lst": round(peak - 0.8 - rnd() * 1.2, 2),
                "area_km2": round((math.pi * (radius_m / 1000) ** 2), 5),
                "radius_m": round(radius_m, 1),
                "intensity": intensity,
                "top_drivers": ["ndbi", "impervious", "svf"] if cls >= 2 else ["ndvi", "era5_temp", "svf"],
                "insight": (
                    f"Detected micro-hotspot near {road.lower()} in {loc['name']} "
                    f"at {lat:.5f} N, {lon:.5f} E."
                ),
                "live": True,
                "source": "synthetic_street_scan",
            })
    spots.sort(key=lambda x: -x["peak_lst"])
    return spots


def build_hotspot_layers(
    hotspots: list[dict],
    zones_fc: dict,
    zone_summary: dict,
    stats: dict,
) -> tuple[list[dict], dict[str, Any]]:
    micro = generate_micro_hotspots(per_locality=8)
    zmean = {zid: float(v.get("mean_lst", 0)) for zid, v in (zone_summary or {}).items()}
    for s in micro:
        zm = zmean.get(s["zone_id"])
        if zm and zm > 35:
            s["peak_lst"] = round(min(52.0, s["peak_lst"] + (zm - 38) * 0.15), 2)
            s["class"] = class_from_peak(s["peak_lst"])
            s["class_label"] = CLASS_NAMES[s["class"]]
            s["color"] = CLASS_COLORS[s["class"]]

    features: list[dict] = []
    for s in micro:
        seed = _hash(s["id"])
        features.append({
            "type": "Feature",
            "id": s["id"],
            "properties": {**s, "kind": "point"},
            "geometry": {"type": "Point", "coordinates": [s["lon"], s["lat"]]},
        })
        features.append({
            "type": "Feature",
            "id": f"{s['id']}_patch",
            "properties": {**s, "kind": "patch"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [_micro_footprint(s["lon"], s["lat"], s["radius_m"], seed)],
            },
        })

    return micro, {"type": "FeatureCollection", "features": features}
