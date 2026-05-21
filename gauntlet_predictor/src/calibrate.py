import numpy as np
from sklearn.linear_model import Ridge

from src.models import Car, RaceLog, Track


def update_beta(track: Track, race_logs: list[RaceLog], cars_dict: dict[str, Car]) -> Track:
    logs = [log for log in race_logs if log.track_id == track.id]

    car_scores: list[float] = []
    actual_times: list[float] = []
    for log in logs:
        car = cars_dict.get(log.car_id)
        if car is None:
            continue
        score = (
            track.w_top_speed * car.n_top_speed
            + track.w_acceleration * car.n_acceleration
            + track.w_handling * car.n_handling
            + track.w_nitro * car.n_nitro
        )
        car_scores.append(score)
        actual_times.append(log.actual_time_sec)

    if len(car_scores) < 2:
        return track

    coeffs = np.polyfit(car_scores, actual_times, 1)
    b, a = float(coeffs[0]), float(coeffs[1])

    if a != 0:
        track.beta = -b / a
    track.par_time_sec = a + b * 0.75
    return track


def refit_weights(track: Track, race_logs: list[RaceLog], cars_dict: dict[str, Car]) -> Track:
    if track.sample_count < 8:
        return track

    logs = [log for log in race_logs if log.track_id == track.id]

    X: list[list[float]] = []
    y: list[float] = []
    for log in logs:
        car = cars_dict.get(log.car_id)
        if car is None:
            continue
        X.append([car.n_top_speed, car.n_acceleration, car.n_handling, car.n_nitro])
        y.append(log.actual_time_sec)

    if len(X) < 8:
        return track

    ridge = Ridge(alpha=1.0)
    ridge.fit(X, y)

    coeffs = np.abs(ridge.coef_)
    total = coeffs.sum()
    if total > 0:
        coeffs = coeffs / total
    coeffs = np.clip(coeffs, 0.0, None)
    total2 = coeffs.sum()
    if total2 > 0:
        coeffs = coeffs / total2

    track.w_top_speed = float(coeffs[0])
    track.w_acceleration = float(coeffs[1])
    track.w_handling = float(coeffs[2])
    track.w_nitro = float(coeffs[3])
    return track
