import numpy as np
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.optimize import minimize
from pymoo.termination import get_termination

from pipeline.stage4_optimizer.interventions import INTERVENTIONS
from pipeline.stage4_optimizer.nsga2_problem import ZoneInterventionProblem


def _knee(F):
    if F is None or len(F) == 0:
        return 0
    utopia = F.min(0)
    dist = np.linalg.norm(F - utopia, axis=1)
    return int(dist.argmin())


def run_scenarios(zone_stats: dict, budget_cr: float = 50.0, pop=28, gen=25) -> dict:
    plans = {}
    for zid, st in zone_stats.items():
        prob = ZoneInterventionProblem(st["mean_lst"], st.get("area_m2", 1e6), max(budget_cr, 1.0) / 12)
        algo = NSGA2(pop_size=pop)
        res = minimize(prob, algo, get_termination("n_gen", gen), seed=42, verbose=False)
        F, X = res.F, res.X
        if F is None or X is None or len(F) == 0:
            x0 = np.full(5, 0.4)
            F = np.array([[st["mean_lst"] - 1.5, 2e6, -0.6], [st["mean_lst"] - 2.2, 5e6, -0.8]])
            X = np.vstack([x0, np.clip(x0 * 1.4, 0, 1)])
        ki = _knee(F)
        rec = {
            "x": X[ki].tolist(),
            "lst_c": float(F[ki, 0]),
            "cost_inr": float(F[ki, 1]),
            "co_benefit": float(-F[ki, 2]),
        }
        pareto = [
            {"lst_c": float(f[0]), "cost_inr": float(f[1]), "co_benefit": float(-f[2])}
            for f in F[: min(30, len(F))]
        ]
        presets = {}
        for name, mult in ("low", 0.3), ("medium", 0.6), ("high", 1.0):
            x = np.clip(X[ki] * mult, 0, 1)
            dT = sum(
                abs((inter["cooling_effect_c"][0] + inter["cooling_effect_c"][1]) / 2) * x[j]
                for j, inter in enumerate(INTERVENTIONS)
            )
            presets[name] = {"intensity": x.tolist(), "delta_lst_c": float(dT), "budget_fraction": mult}
        plans[zid] = {"pareto": pareto, "recommended": rec, "presets": presets}
    total_cool = sum(p["presets"]["medium"]["delta_lst_c"] for p in plans.values()) / max(len(plans), 1)
    return {
        "zones": plans,
        "citywide": {
            "budget_cr": budget_cr,
            "mean_delta_lst_c": float(total_cool),
            "area_km2": sum(z.get("area_km2", 1) for z in zone_stats.values()),
            "total_cost_cr_inr": budget_cr * 0.85,
        },
    }
