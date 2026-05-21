import pytest

from src.models import Car, Track
from src.optimize import optimize_lineup


def _track(id: str, w_ts: float, w_ac: float, w_ha: float, w_ni: float) -> Track:
    return Track(id=id, display_name=id, location="L",
                 w_top_speed=w_ts, w_acceleration=w_ac, w_handling=w_ha, w_nitro=w_ni)


def _car(id: str, ts: float, ac: float, ha: float, ni: float) -> Car:
    return Car(id=id, name=id, rank=1, car_class="S",
               top_speed=ts, acceleration=ac, handling=ha, nitro=ni)


def _make_tracks() -> list[Track]:
    return [
        _track("track_speed",    0.45, 0.25, 0.10, 0.20),
        _track("track_handling", 0.10, 0.25, 0.40, 0.25),
        _track("track_accel",    0.20, 0.45, 0.20, 0.15),
        _track("track_nitro",    0.15, 0.25, 0.20, 0.40),
        _track("track_balanced", 0.25, 0.25, 0.25, 0.25),
    ]


def _make_cars() -> list[Car]:
    # extreme specialisation ensures unambiguous optimal assignment
    return [
        _car("car_speed",    1000, 100, 100, 100),
        _car("car_handler",   100, 100, 1000, 100),
        _car("car_accel",     100, 1000, 100, 100),
        _car("car_nitro",     100, 100, 100, 1000),
        _car("car_balanced",  400, 400, 400, 400),
    ]


def test_specialist_cars_get_correct_tracks() -> None:
    lineup = optimize_lineup(_make_tracks(), _make_cars())
    assert lineup["track_speed"] == "car_speed"
    assert lineup["track_handling"] == "car_handler"


def test_raises_when_fewer_than_5_cars() -> None:
    with pytest.raises(ValueError, match="Need at least 5 cars"):
        optimize_lineup(_make_tracks(), _make_cars()[:4])
