import io

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.core.io_artifacts import read_json


def build_pdf_bytes() -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setTitle("UrbanLens Report")
    c.drawString(72, 800, "UrbanLens — Urban Heat Mitigation Summary")
    try:
        zs = read_json("zone_summary")
        y = 760
        c.drawString(72, y, f"Zones analyzed: {len(zs)}")
        y -= 20
        for zid, v in list(zs.items())[:8]:
            c.drawString(72, y, f"{v['name']}: mean LST {v['mean_lst']:.1f} C")
            y -= 16
    except FileNotFoundError:
        c.drawString(72, 760, "Artifacts not built — run build_artifacts")
    c.showPage()
    c.save()
    return buf.getvalue()
