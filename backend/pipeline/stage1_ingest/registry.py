from app.config import settings
from pipeline.stage1_ingest.synthetic_city import generate_city


def load_city_data(source: str | None = None) -> dict:
    src = source or ("synthetic" if settings.DEMO_MODE else "auto")
    if src == "synthetic" or settings.DEMO_MODE:
        return generate_city(settings.SEED)
    for fn in ("landsat", "sentinel2"):
        try:
            pass  # real path would merge adapters
        except Exception:
            pass
    return generate_city(settings.SEED)
