import re
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.calibrate import refit_weights, update_beta
from src.models import Car, RaceLog
from src.normalize import normalize_garage
from src.optimize import optimize_lineup
from src.predict import predict_time
from src.storage import (
    append_race_log,
    load_cars,
    load_race_logs,
    load_tracks,
    save_cars,
    save_tracks,
)

app = FastAPI(title="Gauntlet Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _make_id(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def _car_dict(car: Car) -> dict:
    """Return asdict(car) with added display_name and overall_score keys."""
    d = asdict(car)
    d["display_name"] = car.name
    d["overall_score"] = (
        car.n_top_speed + car.n_acceleration + car.n_handling + car.n_nitro
    ) / 4
    return d


# ── Pydantic request models ──────────────────────────────────────────────────

class CarInput(BaseModel):
    name: str
    rank: int
    car_class: str
    top_speed: float
    acceleration: float
    handling: float
    nitro: float


class CarUpdate(BaseModel):
    top_speed: Optional[float] = None
    acceleration: Optional[float] = None
    handling: Optional[float] = None
    nitro: Optional[float] = None


class DefenseInput(BaseModel):
    track_ids: list[str]


class LogInput(BaseModel):
    car_id: str
    track_id: str
    actual_time_sec: float
    notes: str = ""


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/tracks")
def get_tracks():
    return [asdict(t) for t in load_tracks()]


@app.get("/cars")
def get_cars():
    return [_car_dict(c) for c in load_cars()]


@app.post("/cars", status_code=201)
def add_car(data: CarInput):
    car_id = _make_id(data.name)
    car = Car(
        id=car_id,
        name=data.name,
        rank=data.rank,
        car_class=data.car_class,
        top_speed=data.top_speed,
        acceleration=data.acceleration,
        handling=data.handling,
        nitro=data.nitro,
    )
    cars = load_cars()
    cars.append(car)
    cars = normalize_garage(cars)
    save_cars(cars)
    return _car_dict(next(c for c in cars if c.id == car_id))


@app.put("/cars/{car_id}")
def update_car(car_id: str, data: CarUpdate):
    cars = load_cars()
    match = next((c for c in cars if c.id == car_id), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"Car '{car_id}' not found")
    if data.top_speed is not None:
        match.top_speed = data.top_speed
    if data.acceleration is not None:
        match.acceleration = data.acceleration
    if data.handling is not None:
        match.handling = data.handling
    if data.nitro is not None:
        match.nitro = data.nitro
    cars = normalize_garage(cars)
    save_cars(cars)
    return _car_dict(match)


@app.delete("/cars/{car_id}")
def delete_car(car_id: str):
    cars = load_cars()
    match = next((c for c in cars if c.id == car_id), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"Car '{car_id}' not found")
    cars = [c for c in cars if c.id != car_id]
    if cars:
        cars = normalize_garage(cars)
    save_cars(cars)
    return {"ok": True}


@app.get("/predict")
def predict(car_id: str, track_id: str):
    cars = load_cars()
    car = next((c for c in cars if c.id == car_id), None)
    if not car:
        raise HTTPException(status_code=404, detail=f"Car '{car_id}' not found")

    tracks = load_tracks()
    track = next((t for t in tracks if t.id == track_id), None)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track '{track_id}' not found")

    time, ci = predict_time(car, track)

    if track.sample_count < 3:
        confidence = "LOW"
    elif track.sample_count < 8:
        confidence = "MEDIUM"
    else:
        confidence = "HIGH"

    return {
        "car_name": car.name,
        "track_name": track.display_name,
        "predicted_time": time,
        "ci": ci,
        "confidence": confidence,
        "stat_contributions": {
            "top_speed": track.w_top_speed * car.n_top_speed,
            "acceleration": track.w_acceleration * car.n_acceleration,
            "handling": track.w_handling * car.n_handling,
            "nitro": track.w_nitro * car.n_nitro,
        },
    }


@app.post("/defense")
def defense(data: DefenseInput):
    if len(data.track_ids) != 5:
        raise HTTPException(status_code=422, detail="Exactly 5 track IDs required")

    cars = load_cars()
    if len(cars) < 5:
        raise HTTPException(status_code=422, detail="Need at least 5 cars in garage")

    tracks = load_tracks()
    track_map = {t.id: t for t in tracks}

    selected: list = []
    for tid in data.track_ids:
        if tid not in track_map:
            raise HTTPException(status_code=404, detail=f"Track '{tid}' not found")
        selected.append(track_map[tid])

    lineup = optimize_lineup(selected, cars)
    car_map = {c.id: c for c in cars}

    assignments = []
    total_time = 0.0
    warnings = []

    for track in selected:
        car = car_map[lineup[track.id]]
        time, ci = predict_time(car, track)
        total_time += time

        if track.sample_count < 3:
            confidence = "LOW"
            warnings.append(track.display_name)
        elif track.sample_count < 8:
            confidence = "MEDIUM"
        else:
            confidence = "HIGH"

        assignments.append({
            "track_id": track.id,
            "track_name": track.display_name,
            "car_id": car.id,
            "car_name": car.name,
            "predicted_time": time,
            "ci": ci,
            "confidence": confidence,
        })

    return {"assignments": assignments, "total_time": total_time, "warnings": warnings}


@app.get("/logs")
def get_logs(limit: int = 20):
    logs = load_race_logs()
    logs.reverse()
    return [asdict(l) for l in logs[:limit]]


@app.post("/log")
def log_run(data: LogInput):
    cars = load_cars()
    car = next((c for c in cars if c.id == data.car_id), None)
    if not car:
        raise HTTPException(status_code=404, detail=f"Car '{data.car_id}' not found")

    tracks = load_tracks()
    track_idx = next((i for i, t in enumerate(tracks) if t.id == data.track_id), None)
    if track_idx is None:
        raise HTTPException(status_code=404, detail=f"Track '{data.track_id}' not found")
    track = tracks[track_idx]

    predicted, _ = predict_time(car, track)
    error = data.actual_time_sec - predicted

    append_race_log(RaceLog(
        timestamp=datetime.now(timezone.utc).isoformat(),
        track_id=track.id,
        car_id=car.id,
        actual_time_sec=data.actual_time_sec,
        predicted_time_sec=predicted,
        notes=data.notes,
    ))

    track.sample_count += 1
    race_logs = load_race_logs()
    cars_dict = {c.id: c for c in cars}
    track = update_beta(track, race_logs, cars_dict)
    weights_refitted = track.sample_count >= 8
    track = refit_weights(track, race_logs, cars_dict)
    tracks[track_idx] = track
    save_tracks(tracks)

    return {
        "actual": data.actual_time_sec,
        "predicted": predicted,
        "error": error,
        "beta_updated": track.beta,
        "weights_refitted": weights_refitted,
    }


@app.get("/calibration-status")
def calibration_status():
    tracks = load_tracks()
    result = []
    for t in tracks:
        if t.sample_count < 3:
            confidence = "LOW"
        elif t.sample_count < 8:
            confidence = "MEDIUM"
        else:
            confidence = "HIGH"
        result.append({
            "id": t.id,
            "display_name": t.display_name,
            "sample_count": t.sample_count,
            "confidence": confidence,
        })
    result.sort(key=lambda x: x["sample_count"])
    return result
