import pytest

from src.models import Car, Track
from src.predict import predict_time


def _track(**kwargs) -> Track:
    defaults = dict(
        id="t", display_name="T", location="L",
        w_top_speed=0.25, w_acceleration=0.25, w_handling=0.25, w_nitro=0.25,
    )
    defaults.update(kwargs)
    return Track(**defaults)


def _car(n_ts: float = 1.0, n_ac: float = 1.0, n_ha: float = 1.0, n_ni: float = 1.0) -> Car:
    return Car(
        id="c", name="C", rank=1, car_class="S",
        top_speed=400, acceleration=300, handling=200, nitro=150,
        n_top_speed=n_ts, n_acceleration=n_ac, n_handling=n_ha, n_nitro=n_ni,
    )


def test_car_score_equals_par_returns_par_time() -> None:
    # balanced weights, par_car_score=0.75; car with all n_*=0.75 scores exactly 0.75
    track = _track(par_time_sec=29.5, par_car_score=0.75)
    car = _car(n_ts=0.75, n_ac=0.75, n_ha=0.75, n_ni=0.75)
    time, _ = predict_time(car, track)
    assert time == pytest.approx(29.5)


def test_car_above_par_is_faster() -> None:
    # car_score = 1.0 > par_car_score 0.75 → predicted < par_time_sec
    track = _track(par_time_sec=29.5, par_car_score=0.75)
    car = _car(n_ts=1.0, n_ac=1.0, n_ha=1.0, n_ni=1.0)
    time, _ = predict_time(car, track)
    assert time < 29.5


def test_car_below_par_is_slower() -> None:
    # car_score = 0.5 < par_car_score 0.75 → predicted > par_time_sec
    track = _track(par_time_sec=29.5, par_car_score=0.75)
    car = _car(n_ts=0.5, n_ac=0.5, n_ha=0.5, n_ni=0.5)
    time, _ = predict_time(car, track)
    assert time > 29.5


def test_confidence_decreases_with_more_samples() -> None:
    car = _car()
    _, ci_0 = predict_time(car, _track(sample_count=0))
    _, ci_5 = predict_time(car, _track(sample_count=5))
    _, ci_10 = predict_time(car, _track(sample_count=10))
    assert ci_0 > ci_5 > ci_10
