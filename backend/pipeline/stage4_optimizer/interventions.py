INTERVENTIONS = [
    {"id": "trees", "name": "Urban tree canopy +10%", "cooling_effect_c": (-2.5, -1.2), "cost_tier": "high", "cost_per_m2_inr": 1200, "co_benefit": 0.95, "zones": ["all"], "citation": "EPA Heat Island Compendium"},
    {"id": "cool_roof", "name": "Cool/white roofs (albedo 0.6)", "cooling_effect_c": (-3.0, -1.5), "cost_tier": "medium", "cost_per_m2_inr": 450, "co_benefit": 0.40, "zones": ["dense"], "citation": "Akbari et al. 2001"},
    {"id": "green_roof", "name": "Green roofs (sedum)", "cooling_effect_c": (-1.8, -0.8), "cost_tier": "medium", "cost_per_m2_inr": 900, "co_benefit": 0.85, "zones": ["commercial"], "citation": "Santamouris 2014"},
    {"id": "permeable", "name": "Permeable pavements", "cooling_effect_c": (-1.0, -0.5), "cost_tier": "low", "cost_per_m2_inr": 280, "co_benefit": 0.60, "zones": ["transport"], "citation": "EPA SWMM"},
    {"id": "water", "name": "Water bodies / blue-green", "cooling_effect_c": (-2.0, -1.0), "cost_tier": "very_high", "cost_per_m2_inr": 2500, "co_benefit": 0.90, "zones": ["all"], "citation": "UNEP Urban Cooling"},
]


def catalogue_dict():
    return {"interventions": INTERVENTIONS, "n": len(INTERVENTIONS)}
