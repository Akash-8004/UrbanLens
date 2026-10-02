from datetime import datetime, timedelta

import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

HORIZONS = [6, 12, 24, 48]


def _lags(series, t_idx, lag=24):
    start = max(0, t_idx - lag)
    window = [series[i]["lst"] for i in range(start, t_idx)]
    if len(window) < lag:
        window = [series[0]["lst"]] * (lag - len(window)) + window
    return window[-lag:]


def train_forecast(city: dict) -> dict:
    ts = city["timeseries"]
    models = {}
    metrics = {}
    out_series = {}
    t_idx = 600  # forecast origin
    for zid, series in ts.items():
        if t_idx >= len(series):
            t_idx = len(series) - 49
        rows, targets = {h: [] for h in HORIZONS}, {h: [] for h in HORIZONS}
        for t in range(48, t_idx):
            lags = _lags(series, t)
            hum = series[t]["humidity"]
            wind = series[t]["wind"]
            ndvi = series[t]["ndvi"]
            hour = datetime.fromisoformat(series[t]["ts"]).hour
            feat = lags + [hum, wind, ndvi, np.sin(hour * np.pi / 12), np.cos(hour * np.pi / 12)]
            for h in HORIZONS:
                if t + h < len(series):
                    rows[h].append(feat)
                    targets[h].append(series[t + h]["lst"])
        zone_models = {}
        zone_metrics = {}
        for h in HORIZONS:
            X, y = np.array(rows[h]), np.array(targets[h])
            if len(X) < 50:
                continue
            split = int(0.8 * len(X))
            reg = HistGradientBoostingRegressor(max_iter=60, random_state=42)
            reg.fit(X[:split], y[:split])
            pred = reg.predict(X[split:])
            persist = X[split:, 0]
            rmse = float(np.sqrt(mean_squared_error(y[split:], pred)))
            prmse = float(np.sqrt(mean_squared_error(y[split:], persist)))
            skill = 1 - rmse / (prmse + 1e-9)
            zone_models[h] = reg
            zone_metrics[str(h)] = {"rmse": rmse, "mae": float(mean_absolute_error(y[split:], pred)), "skill_vs_persistence": skill}
        models[zid] = zone_models
        metrics[zid] = zone_metrics
        # forward curve from t_idx
        lags = _lags(series, t_idx)
        hum, wind, ndvi = series[t_idx]["humidity"], series[t_idx]["wind"], series[t_idx]["ndvi"]
        hour = datetime.fromisoformat(series[t_idx]["ts"]).hour
        feat = np.array([lags + [hum, wind, ndvi, np.sin(hour * np.pi / 12), np.cos(hour * np.pi / 12)]])
        curves = {}
        for h in HORIZONS:
            if h not in zone_models:
                continue
            reg = zone_models[h]
            pred = float(reg.predict(feat)[0])
            resid_std = zone_metrics[str(h)]["rmse"]
            pts = []
            t0 = datetime.fromisoformat(series[t_idx]["ts"])
            for step in range(0, h + 1, max(1, h // 8)):
                pts.append({
                    "ts": (t0 + timedelta(hours=step)).isoformat(),
                    "mean": pred if step == h else float(series[t_idx + step]["lst"]),
                    "lower": pred - 1.96 * resid_std,
                    "upper": pred + 1.96 * resid_std,
                })
            curves[str(h)] = pts
        out_series[zid] = curves
    return {"models": models, "metrics": metrics, "series": out_series, "horizons": HORIZONS}
