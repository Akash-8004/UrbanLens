from pipeline.stage1_ingest.synthetic_city import generate_city


def load_morphology(city: dict | None = None) -> dict:
    city = city or generate_city()
    ch = city["channels"]
    return {
        "building_density": ch["building_density"],
        "mean_height": ch["mean_height"],
        "svf": ch["svf"],
        "synthetic": True,
    }
