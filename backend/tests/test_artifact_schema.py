import pytest

from app.core.io_artifacts import artifact_path


@pytest.mark.skipif(not artifact_path("heatmap.json").exists(), reason="artifacts not built")
def test_heatmap_keys():
    import json

    data = json.loads(artifact_path("heatmap.json").read_text(encoding="utf-8"))
    assert "layers" in data or artifact_path("heatmap_pngs.json").exists()
    assert "bbox" in data
