import json
from dataclasses import asdict
from pathlib import Path

from src.models import Car, RaceLog, Track

DATA_DIR = Path(__file__).parent.parent / "data"


def _ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def load_tracks() -> list[Track]:
    _ensure_data_dir()
    path = DATA_DIR / "tracks.json"
    if not path.exists():
        return []
    with path.open() as f:
        return [Track(**d) for d in json.load(f)]


def save_tracks(tracks: list[Track]) -> None:
    _ensure_data_dir()
    with (DATA_DIR / "tracks.json").open("w") as f:
        json.dump([asdict(t) for t in tracks], f, indent=2)


def load_cars() -> list[Car]:
    _ensure_data_dir()
    path = DATA_DIR / "cars.json"
    if not path.exists():
        return []
    with path.open() as f:
        return [Car(**d) for d in json.load(f)]


def save_cars(cars: list[Car]) -> None:
    _ensure_data_dir()
    with (DATA_DIR / "cars.json").open("w") as f:
        json.dump([asdict(c) for c in cars], f, indent=2)


def load_race_logs() -> list[RaceLog]:
    _ensure_data_dir()
    path = DATA_DIR / "race_log.jsonl"
    if not path.exists():
        return []
    logs = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                logs.append(RaceLog(**json.loads(line)))
    return logs


def append_race_log(log: RaceLog) -> None:
    _ensure_data_dir()
    with (DATA_DIR / "race_log.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps(asdict(log)) + "\n")
