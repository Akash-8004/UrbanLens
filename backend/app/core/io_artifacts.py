import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import settings


def artifact_path(name: str) -> Path:
    if not name.endswith(".json") and not name.endswith(".geojson"):
        name = f"{name}.json"
    return settings.ARTIFACTS_DIR / name


def write_json(name: str, data: Any) -> Path:
    p = artifact_path(name)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=_default)
    return p


def read_json(name: str) -> Any:
    p = artifact_path(name)
    if not p.exists():
        raise FileNotFoundError(f"Artifact missing: {p}. Run build_artifacts.")
    with open(p, encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=32)
def load_cached(name: str) -> str:
    """Cache raw JSON string for hot paths."""
    p = artifact_path(name)
    return p.read_text(encoding="utf-8")


def invalidate_cache():
    load_cached.cache_clear()


def _default(o):
    if hasattr(o, "tolist"):
        return o.tolist()
    if hasattr(o, "item"):
        return o.item()
    raise TypeError(type(o))
