from fastapi import APIRouter

from app.core.io_artifacts import read_json
from app.schemas import OptimizeRequest
from pipeline.stage4_optimizer.scenarios import run_scenarios

router = APIRouter(prefix="/interventions", tags=["interventions"])


def _map_point(p: dict) -> dict:
    """Normalize optimizer point to frontend ParetoPoint shape."""
    if "cooling" in p:
        return p
    cooling = p.get("delta_lst_c")
    if cooling is None and "lst_c" in p:
        # recommended uses absolute post-LST; approximate cooling from intensity if present
        cooling = p.get("delta_lst_c", abs(float(p.get("co_benefit", 0)) * 2))
    return {
        "cooling": float(p.get("delta_lst_c", cooling or 0)),
        "cost": float(p.get("cost_inr", p.get("cost", 0))) / 1e7 if p.get("cost_inr", 0) > 1000 else float(p.get("cost_inr", p.get("cost", p.get("budget_fraction", 0)))),
        "cobenefit": float(p.get("co_benefit", p.get("cobenefit", 0.5))),
        "x": p.get("x") or p.get("intensity"),
    }


@router.get("/catalogue")
def catalogue():
    data = read_json("interventions_catalogue")
    if isinstance(data, list):
        return {"interventions": data}
    if "interventions" in data:
        return data
    # catalogue_dict may be {id: {...}}
    items = []
    for k, v in data.items():
        if isinstance(v, dict):
            items.append({"id": k, **v} if "id" not in v else v)
    return {"interventions": items or data}


@router.post("/optimize")
def optimize(body: OptimizeRequest):
    zs = read_json("zone_summary")
    stats = {
        z: {"mean_lst": v["mean_lst"], "area_m2": v["area_km2"] * 1e6, "area_km2": v["area_km2"]}
        for z, v in zs.items()
    }
    if body.zone_id != "citywide" and body.zone_id in stats:
        stats = {body.zone_id: stats[body.zone_id]}
    budget = body.budget if body.budget > 5 else body.budget * 50  # allow 0–1 slider → crore
    plan = run_scenarios(stats, budget_cr=budget, pop=24, gen=20)
    zplans = plan["zones"]
    key = body.zone_id if body.zone_id in zplans else next(iter(zplans))
    raw = zplans[key]
    rec = raw.get("recommended", {})
    # cooling ≈ mean_lst - lst_c for knee point
    mean_lst = stats[key]["mean_lst"]
    rec_mapped = {
        "cooling": float(mean_lst - rec.get("lst_c", mean_lst)),
        "cost": float(rec.get("cost_inr", 0)) / 1e7,
        "cobenefit": float(rec.get("co_benefit", 0)),
        "x": rec.get("x"),
    }
    presets = {}
    for name, p in raw.get("presets", {}).items():
        presets[name] = {
            "cooling": float(p.get("delta_lst_c", 0)),
            "cost": float(p.get("budget_fraction", 0)),
            "cobenefit": 0.5 + 0.3 * float(p.get("budget_fraction", 0)),
            "x": p.get("intensity"),
        }
    pareto = []
    for f in raw.get("pareto", []):
        pareto.append({
            "cooling": float(mean_lst - f.get("lst_c", mean_lst)),
            "cost": float(f.get("cost_inr", 0)) / 1e7,
            "cobenefit": float(f.get("co_benefit", 0)),
        })
    return {"pareto": pareto, "recommended": rec_mapped, "presets": presets}


@router.get("/plan")
def plan(budget: float = 50.0):
    data = read_json("interventions_plans")
    cw = data.get("citywide", {})
    b = budget if budget > 5 else budget * 50
    return {
        "total_cost_cr": float(cw.get("total_cost_cr_inr", b * 0.85)),
        "total_cooling_c": float(cw.get("mean_delta_lst_c", 0)),
        "area_km2": float(cw.get("area_km2", 0)),
        "budget_cr": b,
        "zones": [
            {
                "zone_id": zid,
                "interventions": ["cool_roofs", "trees"],
                "cooling": float(z.get("presets", {}).get("medium", {}).get("delta_lst_c", 0)),
                "cost_cr": b / max(len(data.get("zones", {})), 1),
            }
            for zid, z in data.get("zones", {}).items()
        ],
    }
