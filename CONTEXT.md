# Gauntlet Predictor — Session Context

## Project
Python CLI + FastAPI backend + Next.js UI predicting lap times for the Gauntlet event
in Asphalt Legends Unite. 36 confirmed 30-second tracks. Hungarian algorithm assigns
the optimal 5-car lineup to 5 tracks in the Defense page.

## Tech Stack
- **Backend**: Python 3.11, FastAPI, uvicorn, scipy (Hungarian), scikit-learn (ridge regression)
- **Frontend**: Next.js (App Router, `src/`), shadcn/ui (base-nova, Tailwind v4), TypeScript
- **Data**: JSON/JSONL in `data/` and `gauntlet_predictor/data/`
- **Tests**: pytest — 20/20 must always pass; all backend changes must be additive

## Commit History

| Hash      | What                                                                 |
|-----------|----------------------------------------------------------------------|
| `7cdd6be` | Initial build: full-stack app                                        |
| `2f59fa5` | Add README with setup guide, API docs, prediction formula            |
| `d5e7285` | fix: show car/track display names in dropdowns, inject display_name  |
| `4fef990` | ✅ UI fix 1 — /tracks stat bars color-coded by stat type             |
| `1165fd8` | ✅ UI fix 2 — /predict: horizontal car-vs-track stat bars            |
| `b6fe0b7` | ✅ UI fix 3 — Garage: class badges, stars, row expander, inline edit |
| `fda8149` | ✅ UI fix 4 — /calibrate: No Data / Building / Calibrated buckets    |
| `ce35fc0` | ✅ UI fix 5 — /defense: chip strip, count-aware button, pair display |
| `5d3882f` | feat(data): scrape 254 cars, seed backend, add scripts               |

> UI fix 6 (dropdown display names in all selects) was part of `d5e7285`.

## Car Data Pipeline
- **Source**: `data/Asphalt_Wiki_Links_11.xlsx` — 330 rows (Car Name + wiki URL)
- **Scraper**: `scripts/scrape_cars.py` — handles 3 HTML table variants on asphalt9.info
  and asphalt.fandom.com; resumes via `data/_scrape_progress.json`
- **Seeder**: `scripts/seed_backend.py` — POSTs raw stats to `POST /cars` (CarInput model)
- **Result**: 254 cars scraped and seeded; 72 in `data/cars_todo.json`
  - `no_url`: 46 — car listed in xlsx but no wiki link provided
  - `mei_a9_unsupported`: 14 — mei-a9.info has a different HTML structure
  - `scrape_failed`: 12 — 6 fandom pages return HTTP 403; 6 pages have no performance table
- **Backend total**: 259 cars (254 scraped + 5 original test cars)

## Key Files
```
gauntlet_predictor/
  api.py                    FastAPI app — routes: /cars /tracks /predict /defense /log /calibration-status
  src/models.py             Car, Track, RaceLog dataclasses
  src/normalize.py          normalize_garage() — sets n_* fields relative to full garage
  src/predict.py            predict_time(car, track) → (time, ci)
  src/optimize.py           optimize_lineup() — scipy Hungarian algorithm
  src/calibrate.py          update_beta(), refit_weights() — called on every /log POST
  src/storage.py            load/save JSON for cars, tracks, race_logs
  data/cars.json            259 cars with normalized scores (re-computed on every save)
  data/tracks.json          36 Gauntlet tracks with weights and par times
data/
  car_stats.json            Scraped raw stats: 254 cars, all star levels
  cars_todo.json            72 cars needing manual data entry or future scraping
  Asphalt_Wiki_Links_11.xlsx  Source URL list
scripts/
  scrape_cars.py            Scraper (run from repo root)
  seed_backend.py           Seeder (requires FastAPI running on :8000)
ui/src/
  lib/api.ts                All TypeScript types + fetch wrappers
  lib/stats.ts              STAT_KEYS, STAT_LABELS, STAT_COLORS — single source of truth
  lib/format.ts             slugToName() utility
  app/page.tsx              Garage (car table with row expander + inline edit)
  app/tracks/page.tsx       Track list with color-coded stat-weight bars
  app/predict/page.tsx      Car vs track stat bars (replaces broken RadarChart)
  app/defense/page.tsx      5-track optimizer with chip strip + chip-pair results
  app/calibrate/page.tsx    Track calibration status grouped into 3 bucket cards
```

## Prediction Formula
```
predicted_time = par_time * (1 + beta * (par_car_score - car_score))
car_score      = w_top_speed*n_ts + w_accel*n_accel + w_handling*n_hdl + w_nitro*n_nitro
overall_score  = (n_top_speed + n_acceleration + n_handling + n_nitro) / 4
```
- `beta` updated via exponential smoothing after each race log
- `w_*` weights refit via ridge regression once a track has ≥ 8 samples
- Track weights always sum to 1.0

## Running Locally
```bash
# Backend (from gauntlet_predictor/)
pip install fastapi uvicorn scikit-learn scipy numpy openpyxl requests beautifulsoup4 lxml tqdm
uvicorn api:app --reload --port 8000

# Seed with real car data (from repo root, backend must be running)
python scripts/seed_backend.py

# Frontend (from ui/)
npm install && npm run dev   # http://localhost:3000

# Tests (from gauntlet_predictor/)
pytest   # must be 20/20
```

## Current Session Goal
**Phase 3 — UI with real data**: verify Garage/Predict/Defense pages render correctly
with 259 real cars, then tackle the 72 todo cars (add missing URLs to xlsx, extend
scraper for mei-a9.info, or enter stats manually via the Garage edit form).
