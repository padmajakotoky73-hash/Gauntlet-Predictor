import re
from datetime import datetime, timezone

import typer
from rich.console import Console
from rich.table import Table

from src.calibrate import refit_weights, update_beta
from src.models import Car, RaceLog, Track
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

app = typer.Typer()
track_app = typer.Typer()
car_app = typer.Typer()
app.add_typer(track_app, name="track")
app.add_typer(car_app, name="car")
console = Console()


def _make_id(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def _resolve_slug(slug: str, all_tracks: list[Track]) -> Track:
    matches = [t for t in all_tracks if slug.lower() in t.id.lower()]
    if len(matches) == 0:
        console.print(f"[red]No track matching '{slug}' found.[/red]")
        raise typer.Exit(1)
    if len(matches) > 1:
        console.print(f"[yellow]'{slug}' is ambiguous. Matches:[/yellow]")
        for m in matches:
            console.print(f"  {m.id}")
        console.print("Please be more specific.")
        raise typer.Exit(1)
    return matches[0]


@track_app.command("list")
def list_tracks() -> None:
    tracks = load_tracks()
    table = Table(title="Gauntlet Tracks")
    table.add_column("#", style="dim", width=3)
    table.add_column("Display Name")
    table.add_column("w_top_speed", justify="right")
    table.add_column("w_accel", justify="right")
    table.add_column("w_handling", justify="right")
    table.add_column("w_nitro", justify="right")
    table.add_column("Samples", justify="right")
    for i, track in enumerate(tracks, 1):
        table.add_row(
            str(i),
            track.display_name,
            f"{track.w_top_speed:.2f}",
            f"{track.w_acceleration:.2f}",
            f"{track.w_handling:.2f}",
            f"{track.w_nitro:.2f}",
            str(track.sample_count),
        )
    console.print(table)


@car_app.command("add")
def add_car() -> None:
    name: str = typer.prompt("Display name")
    rank: int = typer.prompt("Rank", type=int)
    car_class: str = typer.prompt("Class (S/A/B/C/D)")
    top_speed: float = typer.prompt("Top speed", type=float)
    acceleration: float = typer.prompt("Acceleration", type=float)
    handling: float = typer.prompt("Handling", type=float)
    nitro: float = typer.prompt("Nitro", type=float)

    car_id = _make_id(name)
    car = Car(
        id=car_id,
        name=name,
        rank=rank,
        car_class=car_class,
        top_speed=top_speed,
        acceleration=acceleration,
        handling=handling,
        nitro=nitro,
    )
    cars = load_cars()
    cars.append(car)
    cars = normalize_garage(cars)
    save_cars(cars)
    console.print(f"Added [bold]{name}[/bold] with id [cyan]{car_id}[/cyan]")


@car_app.command("list")
def list_cars() -> None:
    cars = load_cars()
    if not cars:
        console.print("No cars in garage. Use [cyan]gauntlet car add[/cyan] to add one.")
        return
    table = Table(title="Garage")
    table.add_column("#", style="dim", width=3)
    table.add_column("Name")
    table.add_column("Class", justify="center")
    table.add_column("Rank", justify="right")
    table.add_column("Top Speed", justify="right")
    table.add_column("Accel", justify="right")
    table.add_column("Handling", justify="right")
    table.add_column("Nitro", justify="right")
    table.add_column("n_top_speed", justify="right")
    table.add_column("n_accel", justify="right")
    table.add_column("n_handling", justify="right")
    table.add_column("n_nitro", justify="right")
    for i, car in enumerate(cars, 1):
        table.add_row(
            str(i),
            car.name,
            car.car_class,
            str(car.rank),
            f"{car.top_speed:.1f}",
            f"{car.acceleration:.1f}",
            f"{car.handling:.1f}",
            f"{car.nitro:.1f}",
            f"{car.n_top_speed:.3f}",
            f"{car.n_acceleration:.3f}",
            f"{car.n_handling:.3f}",
            f"{car.n_nitro:.3f}",
        )
    console.print(table)


@car_app.command("edit")
def edit_car(car_id: str) -> None:
    cars = load_cars()
    matches = [c for c in cars if c.id == car_id]
    if not matches:
        console.print(f"[red]Car '{car_id}' not found.[/red]")
        console.print("Available ids: " + ", ".join(c.id for c in cars))
        raise typer.Exit(1)
    car = matches[0]
    car.top_speed = typer.prompt("Top speed", default=car.top_speed, type=float)
    car.acceleration = typer.prompt("Acceleration", default=car.acceleration, type=float)
    car.handling = typer.prompt("Handling", default=car.handling, type=float)
    car.nitro = typer.prompt("Nitro", default=car.nitro, type=float)
    cars = normalize_garage(cars)
    save_cars(cars)
    console.print(f"Updated [bold]{car.name}[/bold]")


@app.command("predict")
def predict(car_id: str, track_id: str) -> None:
    cars = load_cars()
    car_matches = [c for c in cars if c.id == car_id]
    if not car_matches:
        console.print(f"[red]Car '{car_id}' not found.[/red]")
        console.print("Available ids: " + ", ".join(c.id for c in cars))
        raise typer.Exit(1)
    car = car_matches[0]

    tracks = load_tracks()
    track_matches = [t for t in tracks if track_id.lower() in t.id.lower()]
    if not track_matches:
        console.print(f"[red]Track matching '{track_id}' not found.[/red]")
        raise typer.Exit(1)
    track = track_matches[0]

    time, ci = predict_time(car, track)

    if track.sample_count < 3:
        confidence, conf_color = "LOW", "yellow"
    elif track.sample_count < 8:
        confidence, conf_color = "MEDIUM", "blue"
    else:
        confidence, conf_color = "HIGH", "green"

    console.print(f"Car:   [bold]{car.name}[/bold]")
    console.print(f"Track: [bold]{track.display_name}[/bold]")
    console.print(f"Predicted time: [bold]{time:.3f}s[/bold] +/- {ci:.3f}s")
    console.print(f"Confidence: [{conf_color}]{confidence}[/{conf_color}] (samples: {track.sample_count})")


@app.command("log")
def log_race(
    car_id: str,
    track_id: str,
    time_sec: float,
    notes: str = typer.Option("", "--notes"),
) -> None:
    cars = load_cars()
    car_matches = [c for c in cars if c.id == car_id]
    if not car_matches:
        console.print(f"[red]Car '{car_id}' not found.[/red]")
        console.print("Available ids: " + ", ".join(c.id for c in cars))
        raise typer.Exit(1)
    car = car_matches[0]

    tracks = load_tracks()
    track_matches = [t for t in tracks if track_id.lower() in t.id.lower()]
    if not track_matches:
        console.print(f"[red]Track matching '{track_id}' not found.[/red]")
        raise typer.Exit(1)
    track_idx = next(i for i, t in enumerate(tracks) if t.id == track_matches[0].id)
    track = tracks[track_idx]

    predicted, _ = predict_time(car, track)
    error = time_sec - predicted

    log_entry = RaceLog(
        timestamp=datetime.now(timezone.utc).isoformat(),
        track_id=track.id,
        car_id=car.id,
        actual_time_sec=time_sec,
        predicted_time_sec=predicted,
        notes=notes,
    )
    append_race_log(log_entry)

    track.sample_count += 1
    race_logs = load_race_logs()
    cars_dict = {c.id: c for c in cars}

    track = update_beta(track, race_logs, cars_dict)
    weights_refitted = track.sample_count >= 8
    track = refit_weights(track, race_logs, cars_dict)

    tracks[track_idx] = track
    save_tracks(tracks)

    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_column("Label", style="dim")
    table.add_column("Value")
    table.add_row("Actual:", f"{time_sec:.3f}s")
    table.add_row("Predicted:", f"{predicted:.3f}s")
    table.add_row("Error:", f"+/-{abs(error):.3f}s")
    table.add_row("Beta:", f"{track.beta:.3f} (updated)")
    table.add_row("Weights refitted:", "Yes" if weights_refitted else "No")
    console.print(table)


@app.command("defense")
def defense(
    track1: str,
    track2: str,
    track3: str,
    track4: str,
    track5: str,
) -> None:
    all_tracks = load_tracks()
    cars = load_cars()

    selected: list[Track] = []
    for slug in (track1, track2, track3, track4, track5):
        selected.append(_resolve_slug(slug, all_tracks))

    try:
        lineup = optimize_lineup(selected, cars)
    except ValueError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(1)

    cars_dict = {c.id: c for c in cars}

    table = Table(title="Optimal Defense Lineup")
    table.add_column("Track Name")
    table.add_column("Assigned Car")
    table.add_column("Predicted Time", justify="right")
    table.add_column("+/-CI", justify="right")
    table.add_column("Confidence", justify="center")

    total_time = 0.0
    low_confidence_tracks: list[str] = []

    for track in selected:
        car = cars_dict[lineup[track.id]]
        time, ci = predict_time(car, track)
        total_time += time

        if track.sample_count < 3:
            conf, conf_color = "LOW", "yellow"
            low_confidence_tracks.append(track.display_name)
        elif track.sample_count < 8:
            conf, conf_color = "MEDIUM", "blue"
        else:
            conf, conf_color = "HIGH", "green"

        table.add_row(
            track.display_name,
            car.name,
            f"{time:.3f}s",
            f"{ci:.3f}s",
            f"[{conf_color}]{conf}[/{conf_color}]",
        )

    console.print(table)
    console.print(f"\nTotal predicted time: [bold]{total_time:.3f}s[/bold]")

    for name in low_confidence_tracks:
        console.print(f"[yellow]Warning:[/yellow] {name} has LOW confidence (< 3 samples)")
