from pipeline.stage4_optimizer.scenarios import run_scenarios


def test_nsga_runs_fast():
    stats = {"kurla": {"mean_lst": 38.0, "area_m2": 1e6, "area_km2": 1.0}}
    out = run_scenarios(stats, budget_cr=10, pop=10, gen=5)
    assert "kurla" in out["zones"]
    assert "recommended" in out["zones"]["kurla"]
