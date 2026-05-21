import pytest

from src.models import Car
from src.normalize import normalize_garage


def _car(id: str, ts: float, ac: float, ha: float, ni: float) -> Car:
    return Car(id=id, name=id, rank=1, car_class="S", top_speed=ts, acceleration=ac, handling=ha, nitro=ni)


def test_two_cars_top_speed_ratio() -> None:
    car_a = _car("a", 400, 100, 100, 100)
    car_b = _car("b", 500, 100, 100, 100)
    normalize_garage([car_a, car_b])
    assert car_a.n_top_speed == pytest.approx(0.8)
    assert car_b.n_top_speed == pytest.approx(1.0)


def test_single_car_all_normalized_to_one() -> None:
    car = _car("a", 400, 300, 200, 150)
    normalize_garage([car])
    assert car.n_top_speed == 1.0
    assert car.n_acceleration == 1.0
    assert car.n_handling == 1.0
    assert car.n_nitro == 1.0


def test_original_stats_unchanged() -> None:
    car_a = _car("a", 400, 200, 150, 100)
    car_b = _car("b", 500, 250, 180, 120)
    normalize_garage([car_a, car_b])
    assert car_a.top_speed == 400
    assert car_a.acceleration == 200
    assert car_a.handling == 150
    assert car_a.nitro == 100
    assert car_b.top_speed == 500
    assert car_b.acceleration == 250
