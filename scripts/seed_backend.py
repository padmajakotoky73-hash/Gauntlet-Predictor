#!/usr/bin/env python3
"""
Reads data/car_stats.json and POSTs each car to the FastAPI backend.
Usage: python scripts/seed_backend.py [--stars 6] [--class S]
  --stars N  → only seed cars at star level N (default: max available)
  --class X  → only seed cars of class X (S/A/B/C/D/all, default: all)
"""

import argparse
import json
from pathlib import Path

import requests

ROOT       = Path(__file__).parent.parent
STATS_FILE = ROOT / "data" / "car_stats.json"
API_BASE   = "http://localhost:8000"   # no /api prefix — routes are /cars, /tracks, etc.


def pick_star_row(stars: dict, want: int | None) -> tuple[str, dict] | None:
    """Return the highest available star row up to `want`."""
    order = ["6", "5", "4", "3", "2", "1", "stock"]
    if want is not None:
        want_str = str(want) if want > 0 else "stock"
        order = [s for s in order if (s == "stock" and want == 0)
                                   or (s.isdigit() and int(s) <= want)]
    for lbl in order:
        if lbl in stars:
            return lbl, stars[lbl]
    return None


def seed(star_filter: int | None, class_filter: str):
    cars = json.loads(STATS_FILE.read_text(encoding="utf-8"))
    session = requests.Session()

    ok = err = skip = 0
    for slug, car in cars.items():
        cls = car.get("class", "?")
        if class_filter != "all" and cls != class_filter.upper():
            skip += 1
            continue

        stars = car.get("stars", {})
        row = pick_star_row(stars, star_filter)
        if not row:
            print(f"  x {slug}: no star data")
            err += 1
            continue

        _star_label, raw = row

        # Payload matches CarInput: name, rank, car_class, top_speed, acceleration, handling, nitro
        payload = {
            "name":         car["name"],
            "rank":         0,           # game rank not scraped; backend normalises stats anyway
            "car_class":    cls,
            "top_speed":    raw["top_speed"],
            "acceleration": raw["acceleration"],
            "handling":     raw["handling"],
            "nitro":        raw["nitro"],
        }

        resp = session.post(f"{API_BASE}/cars", json=payload)
        if resp.status_code in (200, 201):
            ok += 1
        elif resp.status_code == 409:          # already exists — update raw stats only
            update = {
                "top_speed":    raw["top_speed"],
                "acceleration": raw["acceleration"],
                "handling":     raw["handling"],
                "nitro":        raw["nitro"],
            }
            # derive car_id the same way the backend does
            import re
            car_id = re.sub(r"[^a-z0-9]+", "_", car["name"].lower()).strip("_")
            resp2 = session.put(f"{API_BASE}/cars/{car_id}", json=update)
            if resp2.ok:
                ok += 1
            else:
                err += 1
                print(f"  x {slug}: PUT {resp2.status_code} {resp2.text[:80]}")
        else:
            err += 1
            print(f"  x {slug}: POST {resp.status_code} {resp.text[:120]}")

    print(f"\nSeeded {ok} | Errors {err} | Skipped {skip}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--stars", type=int, default=None,
                   help="Max star level to use (0=stock, 6=max). Default: highest available.")
    p.add_argument("--class", dest="car_class", default="all",
                   help="Filter by class: S/A/B/C/D/all")
    args = p.parse_args()
    seed(args.stars, args.car_class)
