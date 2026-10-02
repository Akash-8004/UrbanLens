import numpy as np
from sklearn.linear_model import LinearRegression


def fit_bias(sensor_t, ref_t):
    lr = LinearRegression().fit(ref_t.reshape(-1, 1), sensor_t)
    return {"slope": float(lr.coef_[0]), "intercept": float(lr.intercept_), "r2": float(lr.score(ref_t.reshape(-1, 1), sensor_t))}
