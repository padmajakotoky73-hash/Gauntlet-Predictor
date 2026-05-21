import pytest

from src.calibrate import refit_weights, update_beta
from src.models import Car, RaceLog, Track


def _track(**kwargs) -> Track:
    defaults = dict(id="t", display_name="T", location="L",
                    w_top_speed=0.25, w_acceleration=0.25, w_handling=0.25, w_nitro=0.25)
    defaults.update(kwargs)
    return Track(**defaults)


def _car(id: str, score: float) -> Car:
    # all n_* equal so car_score == score with balanced weights
    return Car(id=id, name=id, rank=1, car_class="S",
               top_speed=400, acceleration=300, handling=200, nitro=150,
               n_top_speed=score, n_acceleration=score, n_handling=score, n_nitro=score)


def _log(track_id: str, car_id: str, actual_time: float) -> RaceLog:
    return RaceLog(timestamp="2024-01-01T00:00:00+00:00",
                   track_id=track_id, car_id=car_id,
                   actual_time_sec=actual_time, predicted_time_sec=0.0)


def test_update_beta_changes_from_default() -> None:
    # actual_time = 30 - 2 * car_score → polyfit gives slope=-2, intercept=30
    # beta = -(-2)/30 ≈ 0.0667, which is far from default 1.0
    track = _track()
    cars_dict = {}
    logs = []
    for i, score in enumerate([0.5, 0.6, 0.7, 0.8, 0.9]):
        car = _car(f"c{i}", score)
        cars_dict[f"c{i}"] = car
        logs.append(_log("t", f"c{i}", 30.0 - 2.0 * score))

    result = update_beta(track, logs, cars_dict)
    assert abs(result.beta - 1.0) > 0.01


def test_refit_weights_valid_and_sum_to_one() -> None:
    track = _track(sample_count=8)
    cars_dict = {}
    logs = []
    for i in range(8):
        n_ts = (i + 1) / 9
        n_ac = (9 - i) / 9
        n_ha = 0.4 + i * 0.04
        n_ni = 0.3 + i * 0.05
        car = Car(id=f"c{i}", name=f"c{i}", rank=1, car_class="S",
                  top_speed=400, acceleration=300, handling=200, nitro=150,
                  n_top_speed=n_ts, n_acceleration=n_ac, n_handling=n_ha, n_nitro=n_ni)
        cars_dict[f"c{i}"] = car
        logs.append(_log("t", f"c{i}", 30.0 - n_ts * 2.0 - n_ac * 1.0))

    result = refit_weights(track, logs, cars_dict)
    total = result.w_top_speed + result.w_acceleration + result.w_handling + result.w_nitro
    assert abs(total - 1.0) <= 0.001
    assert result.w_top_speed >= 0.0
    assert result.w_acceleration >= 0.0
    assert result.w_handling >= 0.0
    assert result.w_nitro >= 0.0


def test_refit_weights_skipped_below_8_samples() -> None:
    track = _track(w_top_speed=0.45, w_acceleration=0.25, w_handling=0.10, w_nitro=0.20,
                   sample_count=7)
    cars_dict = {}
    logs = []
    for i in range(7):
        car = _car(f"c{i}", (i + 1) / 8)
        cars_dict[f"c{i}"] = car
        logs.append(_log("t", f"c{i}", 29.0))

    result = refit_weights(track, logs, cars_dict)
    assert result.w_top_speed == pytest.approx(0.45)
    assert result.w_acceleration == pytest.approx(0.25)
    assert result.w_handling == pytest.approx(0.10)
    assert result.w_nitro == pytest.approx(0.20)
