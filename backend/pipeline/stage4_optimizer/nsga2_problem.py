import numpy as np
from pymoo.core.problem import Problem

from pipeline.stage4_optimizer.interventions import INTERVENTIONS


class ZoneInterventionProblem(Problem):
    def __init__(self, baseline_lst: float, area_m2: float, budget_cr: float):
        super().__init__(n_var=5, n_obj=3, n_constr=0, xl=0.0, xu=1.0)
        self.base = baseline_lst
        self.area = area_m2
        self.budget = budget_cr * 1e7  # INR

    def _evaluate(self, X, out, *_):
        cool = np.zeros(len(X))
        cost = np.zeros(len(X))
        cob = np.zeros(len(X))
        for i, x in enumerate(X):
            dT = 0
            c = 0
            cb = 0
            for j, inter in enumerate(INTERVENTIONS):
                lo, hi = inter["cooling_effect_c"]
                eff = (lo + hi) * 0.5  # negative cooling °C
                dT += eff * x[j]
                c += inter["cost_per_m2_inr"] * self.area * x[j] * 0.1
                cb += inter["co_benefit"] * x[j]
            cool[i] = self.base + dT
            cost[i] = c
            cob[i] = -cb / 5
        out["F"] = np.column_stack([cool, cost, cob])
