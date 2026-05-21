from src.models import Car


def normalize_garage(cars: list[Car]) -> list[Car]:
    if not cars:
        return cars

    if len(cars) == 1:
        cars[0].n_top_speed = 1.0
        cars[0].n_acceleration = 1.0
        cars[0].n_handling = 1.0
        cars[0].n_nitro = 1.0
        return cars

    max_ts = max(c.top_speed for c in cars)
    max_ac = max(c.acceleration for c in cars)
    max_ha = max(c.handling for c in cars)
    max_ni = max(c.nitro for c in cars)

    for car in cars:
        car.n_top_speed = car.top_speed / max_ts if max_ts > 0 else 0.0
        car.n_acceleration = car.acceleration / max_ac if max_ac > 0 else 0.0
        car.n_handling = car.handling / max_ha if max_ha > 0 else 0.0
        car.n_nitro = car.nitro / max_ni if max_ni > 0 else 0.0

    return cars
