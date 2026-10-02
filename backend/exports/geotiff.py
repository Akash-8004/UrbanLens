import io
import struct
import zlib

import numpy as np

from app.config import settings
from app.core.io_artifacts import read_json


def write_geotiff_bytes():
    try:
        import rasterio
        from rasterio.transform import from_bounds

        hm = read_json("heatmap")
        # decode lst layer stats only — store class grid placeholder
        arr = np.zeros((hm["height"], hm["width"]), dtype=np.float32)
        bb = settings.bbox
        transform = from_bounds(*bb, hm["width"], hm["height"])
        buf = io.BytesIO()
        with rasterio.open(
            buf, "w", driver="GTiff", height=hm["height"], width=hm["width"], count=1,
            dtype="float32", crs="EPSG:4326", transform=transform,
        ) as dst:
            dst.write(arr, 1)
        return buf.getvalue(), "image/tiff"
    except ImportError:
        return _minimal_png_geotiff(), "image/png"


def _minimal_png_geotiff():
    hm = read_json("heatmap")
    w, h = hm["width"], hm["height"]
    raw = b"".join([b"\x00" * (w * 3) for _ in range(h)])
    comp = zlib.compress(raw, 9)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", comp) + chunk(b"IEND", b"")
    return png
