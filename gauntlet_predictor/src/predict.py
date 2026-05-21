from math import sqrt

from src.models import Car, Track


def predict_time(car: Car, track: Track) -> tuple[float, float]:
    car_score = (
        track.w_top_speed * car.n_top_speed
        + track.w_acceleration * car.n_acceleration
        + track.w_handling * car.n_handling
        + track.w_nitro * car.n_nitro
    )
    predicted = track.par_time_sec * (1 + track.beta * (track.par_car_score - car_score))
    confidence_interval = max(0.1, 1.5 / sqrt(1 + track.sample_count))
    return (predicted, confidence_interval)
