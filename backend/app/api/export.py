import csv
import io

from fastapi import APIRouter
from fastapi.responses import Response, StreamingResponse

from app.core.io_artifacts import read_json
from exports.geotiff import write_geotiff_bytes
from exports.pdf_report import build_pdf_bytes

router = APIRouter(prefix="/export", tags=["export"])


@router.post("/report.pdf")
def export_pdf():
    return Response(content=build_pdf_bytes(), media_type="application/pdf")


@router.get("/heatmap.geojson")
def export_geojson():
    return read_json("zones")


@router.get("/heatmap.geotiff")
def export_geotiff():
    data, ctype = write_geotiff_bytes()
    return Response(content=data, media_type=ctype)


@router.get("/summary.csv")
def export_csv():
    zs = read_json("zone_summary")
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["zone_id", "name", "mean_lst", "max_lst", "area_km2"])
    for zid, v in zs.items():
        w.writerow([zid, v["name"], v["mean_lst"], v["max_lst"], v["area_km2"]])
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv")
