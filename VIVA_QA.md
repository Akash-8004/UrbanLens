# Viva Q&A (honest answers)

1. **Why 30 m?** Landsat thermal / common urban UHI studies; balances morphology detail vs compute.
2. **Why synthetic data?** Offline demo; real GEE/CDS need accounts. Adapters exist; provenance always tagged.
3. **Why not U-Net live?** Optional torch path; P0 uses HistGradientBoosting for speed + SHAP compatibility. Active architecture is named on About.
4. **Why PINN?** Soft energy-balance constraint reduces OOD error vs unconstrained MLP (see `/api/pinn/metrics`).
5. **PINN failure modes?** Wrong physics term, conflicting observations, under-constrained fluxes, λ too large → bias.
6. **Why NSGA-II over weighted sum?** Avoids arbitrary scalar weights; Pareto shows trade-offs; knee picks recommended.
7. **LST vs air temperature?** Satellite LST is surface skin; DHT11 measures air — systematic offset expected (About + Sensors validation).
8. **How scale to 50 nodes?** MQTT broker, spatial kriging/bias fields, battery/network ops, privacy of locations.
9. **Spatial generalization?** Train north half / test south — reported accuracy delta in classifier metrics.
10. **Intervention numbers?** Literature-grounded ranges with citations in catalogue — not city-calibrated RCTs.
11. **Bias correction?** Linear sensor vs ERA5 cell → slope/intercept/R² in validation artifact.
12. **Why SHAP TreeExplainer?** Fast, exact for tree ensembles; DeepExplainer unnecessary here.
13. **Determinism?** Seed 42 for city, models, optimizer.
14. **Cloud dependency?** None for core path after `pip`/`npm` install (basemap tiles optional).
15. **Ethics?** Never present synthetic as measured; badges + README prototype section.
16. **Future work?** Real Landsat/ERA5 ingest, torch U-Net, multi-node IoT, stakeholder budget UI.
17. **Macro IoU?** Jaccard over 4 heat classes on held-in pixels; reported in model registry.
18. **Heat-wave window?** Synthetic 3-day spike in zone timeseries so forecast demo is dramatic but labelled.
19. **Cost units?** INR crore for city plans — illustrative for Mumbai-scale interventions.
20. **Why React not Streamlit?** Mission-control UX; MapLibre overlays; Streamlit optional notebooks only.
