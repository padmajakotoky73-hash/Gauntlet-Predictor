from dataclasses import dataclass


@dataclass
class Track:
    id: str
    display_name: str
    location: str
    w_top_speed: float
    w_acceleration: float
    w_handling: float
    w_nitro: float
    par_time_sec: float = 29.5
    par_car_score: float = 0.75
    beta: float = 1.0
    sample_count: int = 0
    profile: str = "mixed_circuit"
    track_length: str = "Medium"


@dataclass
class Car:
    id: str
    name: str
    rank: int
    car_class: str
    top_speed: float
    acceleration: float
    handling: float
    nitro: float
    n_top_speed: float = 0.0
    n_acceleration: float = 0.0
    n_handling: float = 0.0
    n_nitro: float = 0.0


@dataclass
class RaceLog:
    timestamp: str
    track_id: str
    car_id: str
    actual_time_sec: float
    predicted_time_sec: float
    notes: str = ""
