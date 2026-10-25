from app.config import settings
from pipeline.stage1_ingest.synthetic_city import generate_city


def load_city_data(source: str | None = None) -> dict:
    # Real adapters (landsat/sentinel2/era5) are stubs for now, so every path
    # falls back to the seeded synthetic city.
    return generate_city(settings.SEED)
