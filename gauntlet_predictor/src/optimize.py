import numpy as np
from scipy.optimize import linear_sum_assignment

from src.models import Car, Track
from src.normalize import normalize_garage
from src.predict import predict_time


def optimize_lineup(tracks: list[Track], cars: list[Car]) -> dict[str, str]:
    if len(cars) < 5:
        raise ValueError("Need at least 5 cars in garage")

    cars = normalize_garage(cars)

    cost_matrix = np.array([
        [predict_time(car, track)[0] for track in tracks]
        for car in cars
    ])

    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    return {tracks[col_ind[k]].id: cars[row_ind[k]].id for k in range(len(col_ind))}
