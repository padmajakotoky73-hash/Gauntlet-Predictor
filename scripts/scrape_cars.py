#!/usr/bin/env python3
"""
Gauntlet Predictor — Car Stats Scraper
Reads car_links from the xlsx, scrapes asphalt9.info / fandom wiki,
saves data/car_stats.json and data/cars_todo.json.
Run from repo root: python scripts/scrape_cars.py
"""

import json
import re
import time
from pathlib import Path

import openpyxl
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

# ── paths ──────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).parent.parent
XLSX_PATH  = ROOT / "data" / "Asphalt_Wiki_Links_11.xlsx"
STATS_OUT  = ROOT / "data" / "car_stats.json"
TODO_OUT   = ROOT / "data" / "cars_todo.json"
PROGRESS   = ROOT / "data" / "_scrape_progress.json"

HEADERS = {"User-Agent": "GauntletPredictor/2.0 (educational tool)"}
DELAY   = 1.2   # seconds between requests — be polite

STAR_LABELS = ["stock", "1", "2", "3", "4", "5", "6"]


# ── helpers ────────────────────────────────────────────────────────────────────
def to_slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")

def eu_float(s: str) -> float:
    """Parse European-format floats like '74,8' or '74.8'."""
    return float(str(s).strip().replace(",", "."))

def read_xlsx(path: Path) -> list[dict]:
    """Return list of {name, url} from Sheet1."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    cars = []
    for row in rows[1:]:          # skip header
        if not row[0]:
            continue
        name = str(row[0]).strip()
        url  = str(row[1]).strip() if row[1] else ""
        if url in ("", "None"):
            url = ""
        cars.append({"name": name, "url": url})
    wb.close()
    return cars


# ── scraper: asphalt9.info ────────────────────────────────────────────────────
def scrape_asphalt9_info(url: str, session: requests.Session) -> dict | None:
    try:
        r = session.get(url, timeout=15)
        r.raise_for_status()
    except Exception as e:
        print(f"  ✗ fetch error: {e}")
        return None

    soup = BeautifulSoup(r.text, "lxml")

    # find the Performance Data table — may use <th> or <td> for header row
    target_table = None
    for table in soup.find_all("table"):
        # Check <th> elements first (older page format)
        headers_text = " ".join(th.get_text() for th in table.find_all("th")).lower()
        # Fallback: check first row <td> cells (newer page format — no <th> at all)
        first_tr = table.find("tr")
        if first_tr:
            first_row_text = " ".join(td.get_text() for td in first_tr.find_all(["th", "td"])).lower()
        else:
            first_row_text = ""
        combined = headers_text + " " + first_row_text
        if ("top speed" in combined or "topspeed" in combined) and "acceleration" in combined:
            target_table = table
            break

    if not target_table:
        print("  ✗ no Performance Data table found")
        return None

    rows = target_table.find_all("tr")
    stars_data = {}
    row_idx = 0
    for tr in rows:
        cells = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
        if not cells:
            continue
        label = cells[0].lower().replace("⭐", "").replace("★", "").replace("\xa0", " ").strip()
        # Skip header rows (contain column names, not numeric data)
        if any(kw in label for kw in ("topspeed", "top speed", "max", "acceleration")):
            continue
        # match: stock, 1, 2, 3, 4, 5, 6
        if label == "stock" or (label.isdigit() and label in STAR_LABELS):
            if len(cells) >= 5:
                try:
                    stars_data[label] = {
                        "top_speed":    eu_float(cells[1]),
                        "acceleration": eu_float(cells[2]),
                        "handling":     eu_float(cells[3]),
                        "nitro":        eu_float(cells[4]),
                    }
                except ValueError:
                    pass   # skip malformed rows
        row_idx += 1

    if not stars_data:
        print("  ✗ parsed 0 star rows")
        return None

    # extract rank table (optional — we store it but won't crash without it)
    ranks = {}
    for table in soup.find_all("table"):
        cells = [td.get_text(strip=True) for td in table.find_all(["th","td"])]
        row_texts = [c.lower() for c in cells]
        if "stock" in row_texts and any(c.isdigit() and int(c) > 100 for c in cells):
            # find two consecutive rows: labels then values
            trs = table.find_all("tr")
            if len(trs) >= 2:
                labels = [td.get_text(strip=True).lower().replace("⭐","").strip()
                          for td in trs[0].find_all(["th","td"])]
                values = [td.get_text(strip=True)
                          for td in trs[1].find_all(["th","td"])]
                for lbl, val in zip(labels, values):
                    try:
                        ranks[lbl] = int(val.replace(",","").replace(".",""))
                    except ValueError:
                        pass
            break

    return {"stars": stars_data, "ranks": ranks}


# ── scraper: asphalt.fandom.com ───────────────────────────────────────────────
def scrape_fandom(url: str, session: requests.Session) -> dict | None:
    try:
        r = session.get(url, timeout=15)
        r.raise_for_status()
    except Exception as e:
        print(f"  ✗ fetch error: {e}")
        return None

    soup = BeautifulSoup(r.text, "lxml")

    target_table = None
    for table in soup.find_all("table"):
        headers_text = " ".join(th.get_text() for th in table.find_all("th")).lower()
        if "top speed" in headers_text and ("acceleration" in headers_text or "accel" in headers_text):
            target_table = table
            break

    if not target_table:
        print("  ✗ fandom: no Performance Data table")
        return None

    rows_data = {}
    for tr in target_table.find_all("tr"):
        cells = [td.get_text(strip=True) for td in tr.find_all(["td","th"])]
        if not cells:
            continue
        label = cells[0].lower().replace("⭐","").replace("★","").strip()
        if label == "stock" or (label.isdigit() and label in STAR_LABELS):
            if len(cells) >= 5:
                try:
                    rows_data[label] = {
                        "top_speed":    eu_float(cells[1]),
                        "acceleration": eu_float(cells[2]),
                        "handling":     eu_float(cells[3]),
                        "nitro":        eu_float(cells[4]),
                    }
                except ValueError:
                    pass

    if not rows_data:
        return None
    return {"stars": rows_data, "ranks": {}}


# ── dispatcher ────────────────────────────────────────────────────────────────
def scrape_car(url: str, session: requests.Session) -> dict | None:
    if "asphalt9.info" in url:
        return scrape_asphalt9_info(url, session)
    if "asphalt.fandom.com" in url:
        return scrape_fandom(url, session)
    # mei-a9.info and others — structure unknown, flag as todo
    print(f"  ⚠ unsupported host, flagging as todo")
    return None


# ── main ──────────────────────────────────────────────────────────────────────
def main():
    Path(ROOT / "data").mkdir(exist_ok=True)
    Path(ROOT / "scripts").mkdir(exist_ok=True)

    # load xlsx
    print("Reading xlsx…")
    cars = read_xlsx(XLSX_PATH)
    print(f"  {len(cars)} cars found in xlsx")

    # load existing progress (resume support)
    if PROGRESS.exists():
        done = json.loads(PROGRESS.read_text())
        print(f"  Resuming — {len(done)} already scraped")
    else:
        done = {}

    stats_out = {}
    todos = []

    session = requests.Session()
    session.headers.update(HEADERS)

    for car in tqdm(cars, unit="car"):
        name = car["name"]
        url  = car["url"]
        slug = to_slug(name)

        # derive car class from url if possible
        car_class = "?"
        for cls in ["class-s", "class-a", "class-b", "class-c", "class-d"]:
            if cls in url:
                car_class = cls.replace("class-", "").upper()
                break

        if not url:
            todos.append({"name": name, "slug": slug, "reason": "no_url"})
            continue

        if "mei-a9.info" in url:
            todos.append({"name": name, "slug": slug, "url": url,
                          "reason": "mei_a9_unsupported"})
            continue

        if slug in done:
            stats_out[slug] = done[slug]
            continue

        print(f"\n→ {name} ({slug})")
        result = scrape_car(url, session)

        if result is None:
            todos.append({"name": name, "slug": slug, "url": url,
                          "reason": "scrape_failed"})
            continue

        entry = {
            "name":       name,
            "slug":       slug,
            "class":      car_class,
            "source_url": url,
            "stars":      result["stars"],
            "ranks":      result.get("ranks", {}),
        }
        stats_out[slug] = entry
        done[slug]      = entry

        # save progress after every successful scrape
        PROGRESS.write_text(json.dumps(done, indent=2))

        time.sleep(DELAY)

    # final write
    STATS_OUT.write_text(json.dumps(stats_out, indent=2))
    TODO_OUT.write_text(json.dumps(todos, indent=2))
    PROGRESS.unlink(missing_ok=True)   # clean up

    print(f"\n✓ Scraped:  {len(stats_out)} cars → {STATS_OUT}")
    print(f"  Todo:     {len(todos)} cars  → {TODO_OUT}")
    print(f"\n  Breakdown of todos:")
    from collections import Counter
    reasons = Counter(t["reason"] for t in todos)
    for reason, count in reasons.items():
        print(f"    {reason}: {count}")


if __name__ == "__main__":
    main()
