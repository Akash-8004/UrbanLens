from datetime import datetime, timezone


def build_registry(heat_metrics, pinn_metrics, forecast_metrics, unet_status) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "models": [
            {
                "name": "heatmap-model",
                "version": "1.0.0",
                "class": "HistGradientBoostingClassifier",
                "library": "scikit-learn",
                "trained_at": now,
                "metrics": heat_metrics,
                "features": ["ndvi", "ndbi", "mndwi", "impervious", "building_density", "mean_height", "svf", "era5_temp", "era5_humidity", "net_radiation"],
            },
            {"name": "pinn-energy-balance", "version": "1.0.0", "class": "numpy MLP", "library": "numpy", "trained_at": now, "metrics": pinn_metrics},
            {"name": "heat-forecaster", "version": "1.0.0", "class": "HistGradientBoostingRegressor", "library": "scikit-learn", "trained_at": now, "metrics": forecast_metrics},
            {"name": "unet-segmentation", "version": "0.0.0", "class": "optional", "library": "torch", "trained_at": now, "metrics": unet_status},
        ]
    }
