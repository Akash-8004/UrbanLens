import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

FEATURE_NAMES = ["ndvi", "ndbi", "mndwi", "impervious", "building_density", "mean_height", "svf", "era5_temp", "era5_humidity", "net_radiation"]
CLASS_NAMES = ["Low", "Moderate", "High", "Extreme"]


def lst_to_classes(lst: np.ndarray) -> np.ndarray:
    p50, p75, p90, p95 = np.nanpercentile(lst, [50, 75, 90, 95])
    y = np.zeros(lst.shape, dtype=int)
    y[lst >= p50] = 1
    y[lst >= p75] = 2
    y[lst >= p90] = 3
    y[lst >= p95] = 3
    return y


def train_heat_classifier(city: dict, max_samples: int = 40000):
    from pipeline.stage2_features.stack import build_feature_matrix

    h, w = city["land_mask"].shape
    h = city["land_mask"].shape[0]
    X, lst, _, rows = build_feature_matrix(city, max_samples=max_samples)
    y = lst_to_classes(lst)
    clf = HistGradientBoostingClassifier(max_iter=80, random_state=42)
    north_row = rows >= h // 2
    clf.fit(X[~north_row], y[~north_row])
    y_pred_s = clf.predict(X[north_row])
    spatial = {"north_train_south_test_acc": float(accuracy_score(y[north_row], y_pred_s))}
    clf.fit(X, y)
    y_pred = clf.predict(X)
    cm = confusion_matrix(y, y_pred).tolist()
    rep = classification_report(y, y_pred, target_names=CLASS_NAMES, output_dict=True)
    macro_iou = float(np.mean([cm[i][i] / (sum(cm[i]) + sum(r[i] for r in [cm[j] for j in range(4)]) - cm[i][i] + 1e-9) for i in range(4)]))
    # full grid predict
    ch = city["channels"]
    planes = [np.nan_to_num(ch[n], nan=0.0).ravel() for n in FEATURE_NAMES]
    Xfull = np.column_stack(planes)
    classes = clf.predict(Xfull).reshape(h, w).astype(np.uint8)
    classes[~city["land_mask"]] = 255
    return {
        "model": clf,
        "classes": classes,
        "metrics": {"accuracy": float(accuracy_score(y, y_pred)), "macro_iou": macro_iou, "report": rep, "spatial": spatial},
        "confusion_matrix": cm,
        "thresholds": {f"p{p}": float(np.nanpercentile(lst, p)) for p in (50, 75, 90, 95)},
    }
