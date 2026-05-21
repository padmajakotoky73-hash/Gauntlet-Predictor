# Gauntlet Predictor

A full-stack lap time predictor for the **Gauntlet** event in Asphalt Legends Unite. Enter your car stats, get predicted times for any of the 36 confirmed tracks, and let the optimizer pick your best 5-car defensive lineup using the Hungarian assignment algorithm.

---

## Features

- **Predict** — weighted car score formula gives you an estimated lap time + confidence interval for any car/track combo
- **Defense Optimizer** — picks the optimal car for each of your 5 Gauntlet tracks (Hungarian algorithm via scipy)
- **Calibration** — logs actual race times and refits track weights using Ridge regression after 8+ samples
- **36 tracks** — all seeded with hand-tuned weights (top speed / acceleration / handling / nitro) based on profile and length
- **CLI** — fully usable from the terminal without the UI
- **REST API** — FastAPI backend with 10 endpoints and Swagger docs
- **Web UI** — Next.js 16 dark dashboard with 5 pages

---

## Project Structure

```
Gauntlet Predictor/
├── gauntlet_predictor/       # Python backend + CLI
│   ├── api.py                # FastAPI app (10 endpoints)
│   ├── src/
│   │   ├── models.py         # Track, Car, RaceLog dataclasses
│   │   ├── storage.py        # JSON/JSONL read/write
│   │   ├── normalize.py      # Garage normalization
│   │   ├── predict.py        # Lap time prediction formula
│   │   ├── calibrate.py      # Beta update + Ridge weight refitting
│   │   ├── optimize.py       # Hungarian algorithm lineup optimizer
│   │   └── cli.py            # Typer CLI (gauntlet command)
│   ├── data/
│   │   ├── tracks.json       # 36 tracks with weights
│   │   ├── cars.json         # Your garage
│   │   └── seed_tracks.py    # Track seeding script
│   └── tests/                # 20 pytest tests
└── ui/                       # Next.js 16 frontend
    └── src/
        ├── app/
        │   ├── page.tsx           # Garage (cars CRUD)
        │   ├── tracks/page.tsx    # Track browser (36 cards)
        │   ├── predict/page.tsx   # Predict page
        │   ├── defense/page.tsx   # Defense optimizer
        │   └── calibrate/page.tsx # Log & calibrate
        ├── components/
        │   └── sidebar.tsx        # Nav sidebar
        └── lib/
            └── api.ts             # Typed API client
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Language | Python 3.11+, TypeScript |
| CLI | Typer + Rich |
| Math | NumPy, SciPy (Hungarian), scikit-learn (Ridge) |
| API | FastAPI + Uvicorn |
| Frontend | Next.js 16 (App Router) |
| UI | shadcn/ui, Tailwind v4, Recharts, Lucide |
| Fonts | Geist Sans / Geist Mono |
| Tests | pytest (20 tests) |
| Storage | JSON / JSONL (no database) |

---

## Getting Started

### 1. Backend (Python CLI + API)

```bash
cd gauntlet_predictor

# Install dependencies
pip install -e ".[dev]"

# Seed track data (first time only)
python data/seed_tracks.py

# Run the CLI
gauntlet track list
gauntlet car add
gauntlet predict <car_id> <track_id>
gauntlet defense <track1> <track2> <track3> <track4> <track5>
gauntlet log <car_id> <track_id> <time_sec>

# Run tests
python -m pytest tests/ -v

# Start the API server
uvicorn api:app --port 8000 --reload
# Docs at http://localhost:8000/docs
```

### 2. Frontend (Next.js)

```bash
cd ui

# Copy env file
cp .env.local.example .env.local

# Install and run
npm install
npm run dev
# Open http://localhost:3000
```

> Make sure the FastAPI server is running on port 8000 before starting the UI.

---

## How Prediction Works

```
car_score = w_top_speed * n_top_speed
          + w_acceleration * n_acceleration
          + w_handling * n_handling
          + w_nitro * n_nitro

predicted_time = par_time * (1 + beta * (par_car_score - car_score))
```

- Stats are **normalized** across your garage (best car = 1.0 per stat)
- Track **weights** reflect how much each stat matters (sum to 1.0)
- **Beta** is updated from race logs via linear regression
- Weights are **refitted** via Ridge regression after 8+ logged runs per track

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/tracks` | All 36 tracks |
| GET | `/cars` | Garage cars |
| POST | `/cars` | Add car |
| PUT | `/cars/{id}` | Update car stats |
| DELETE | `/cars/{id}` | Remove car |
| GET | `/predict` | Predict time for car+track |
| POST | `/defense` | Optimize 5-track lineup |
| GET | `/logs` | Recent race logs |
| POST | `/log` | Log a race result |
| GET | `/calibration-status` | Per-track confidence levels |

---

## Track Profiles

| Profile | Dominant Stat |
|---|---|
| `pure_straight` | Top Speed |
| `highway_with_turns` | Top Speed + Nitro |
| `mixed_circuit` | Balanced |
| `twisty_city` | Handling |
| `twisty_off_road` | Handling + Nitro |
| `jump_heavy` | Nitro + Acceleration |
| `tunnel_tight` | Handling + Acceleration |
