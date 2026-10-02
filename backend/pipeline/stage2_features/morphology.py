import numpy as np


def canyon_factor(height, svf):
    return np.clip(height / 45 * (1 - svf), 0, 1)
