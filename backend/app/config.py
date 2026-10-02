from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ROOT.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(PROJECT_ROOT / ".env"), extra="ignore")

    DEMO_MODE: bool = True
    SEED: int = 42
    # Western Line corridor: south Mumbai → Palghar / Boisar
    BBOX_MIN_LAT: float = 18.88
    BBOX_MAX_LAT: float = 19.85
    BBOX_MIN_LON: float = 72.70
    BBOX_MAX_LON: float = 73.02
    GRID_H: int = 140
    GRID_W: int = 100
    ARTIFACTS_DIR: Path = ROOT / ".artifacts"
    DATA_DIR: Path = PROJECT_ROOT / "data"
    IOT_DB_PATH: Path = PROJECT_ROOT / "data" / "iot" / "readings.db"
    CORS_ORIGINS: str = "http://localhost:5173"
    MQTT_HOST: str = "localhost"
    MQTT_PORT: int = 1883
    IOT_SSE_INTERVAL_S: float = 5.0

    @property
    def bbox(self) -> tuple[float, float, float, float]:
        return (self.BBOX_MIN_LON, self.BBOX_MIN_LAT, self.BBOX_MAX_LON, self.BBOX_MAX_LAT)


settings = Settings()
settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
(settings.DATA_DIR / "iot").mkdir(parents=True, exist_ok=True)
