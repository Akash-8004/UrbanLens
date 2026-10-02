import numpy as np


def ndvi(nir, red):
    return (nir - red) / (nir + red + 1e-9)


def ndbi(swir, nir):
    return (swir - nir) / (swir + nir + 1e-9)


def mndwi(green, swir):
    return (green - swir) / (green + swir + 1e-9)
