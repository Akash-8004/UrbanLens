from pipeline.stage4_optimizer.interventions import INTERVENTIONS, catalogue_dict


def test_catalogue_size():
    assert len(INTERVENTIONS) == 5
    assert catalogue_dict()["n"] == 5
