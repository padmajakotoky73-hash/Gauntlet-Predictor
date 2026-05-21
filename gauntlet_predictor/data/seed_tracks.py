import json
import sys
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models import Track

TRACKS: list[Track] = [
    Track("auckland_straight_sprint",      "Auckland — Straight Sprint",           "Auckland",      0.21, 0.28, 0.31, 0.20, profile="mixed_circuit",      track_length="Medium-ish Long"),
    Track("auckland_hairpin_finish",        "Auckland — Hairpin Finish",            "Auckland",      0.20, 0.27, 0.42, 0.11, profile="twisty_city",         track_length="Long"),
    Track("buenos_aires_water_run",         "Buenos Aires — Water Run",             "Buenos Aires",  0.18, 0.30, 0.30, 0.22, profile="mixed_circuit",      track_length="Medium"),
    Track("buenos_aires_la_boca",           "Buenos Aires — La Boca",               "Buenos Aires",  0.20, 0.27, 0.42, 0.11, profile="twisty_city",         track_length="Long"),
    Track("cairo_gezira_island",            "Cairo — Gezira Island",                "Cairo",         0.18, 0.30, 0.30, 0.22, profile="mixed_circuit",      track_length="Medium"),
    Track("cairo_kings_revival",            "Cairo — The King's Revival",           "Cairo",         0.20, 0.30, 0.20, 0.30, profile="jump_heavy",          track_length="Medium"),
    Track("greenland_ice_breakers",         "Greenland — Ice Breakers",             "Greenland",     0.23, 0.27, 0.32, 0.18, profile="mixed_circuit",      track_length="Long"),
    Track("greenland_out_of_centre",        "Greenland — Out of The Centre",        "Greenland",     0.23, 0.27, 0.32, 0.18, profile="mixed_circuit",      track_length="Long"),
    Track("himalayas_leap_of_faith",        "Himalayas — Leap Of Faith",            "Himalayas",     0.40, 0.28, 0.08, 0.24, profile="pure_straight",      track_length="Short"),
    Track("himalayas_freefall",             "Himalayas — Freefall",                 "Himalayas",     0.15, 0.33, 0.18, 0.34, profile="jump_heavy",          track_length="Short"),
    Track("scotland_ghost_ships",           "Scotland — Ghost Ships",               "Scotland",      0.10, 0.25, 0.35, 0.30, profile="twisty_off_road",    track_length="Medium"),
    Track("scotland_rocky_valley",          "Scotland — Rocky Valley",              "Scotland",      0.20, 0.30, 0.20, 0.30, profile="jump_heavy",          track_length="Medium"),
    Track("caribbean_hell_vale",            "Caribbean — Hell Vale",                "Caribbean",     0.18, 0.30, 0.30, 0.22, profile="mixed_circuit",      track_length="Medium"),
    Track("caribbean_resort_dash",          "Caribbean — Resort Dash",              "Caribbean",     0.13, 0.33, 0.28, 0.26, profile="mixed_circuit",      track_length="Short"),
    Track("osaka_meiji_rush",               "Osaka — Meiji Rush",                   "Osaka",         0.15, 0.30, 0.40, 0.15, profile="twisty_city",         track_length="Medium"),
    Track("osaka_mamba_park",               "Osaka — Mamba Park",                   "Osaka",         0.13, 0.33, 0.28, 0.26, profile="mixed_circuit",      track_length="Short"),
    Track("norway_future_fusion",           "Norway — Future Fusion",               "Norway",        0.40, 0.28, 0.08, 0.24, profile="pure_straight",      track_length="Short"),
    Track("norway_rocketing_to_future",     "Norway — Rocketing to the Future",     "Norway",        0.25, 0.27, 0.22, 0.26, profile="jump_heavy",          track_length="Long"),
    Track("tuscany_riverine_launch",        "Tuscany — Riverine Launch",            "Tuscany",       0.20, 0.27, 0.42, 0.11, profile="twisty_city",         track_length="Long"),
    Track("tuscany_vineyard_voyage",        "Tuscany — Vineyard Voyage",            "Tuscany",       0.18, 0.30, 0.30, 0.22, profile="mixed_circuit",      track_length="Medium"),
    Track("us_midwest_trainspotter",        "U.S. Midwest — Trainspotter",          "U.S. Midwest",  0.45, 0.25, 0.10, 0.20, profile="pure_straight",      track_length="Medium"),
    Track("us_midwest_its_a_twister",       "U.S. Midwest — It's A Twister",        "U.S. Midwest",  0.21, 0.28, 0.31, 0.20, profile="mixed_circuit",      track_length="Medium-ish Long"),
    Track("san_francisco_the_tunnel",       "San Francisco — The Tunnel",           "San Francisco", 0.17, 0.32, 0.34, 0.17, profile="tunnel_tight",       track_length="Medium-ish Short"),
    Track("san_francisco_railroad_bustle",  "San Francisco — Railroad Bustle",      "San Francisco", 0.30, 0.28, 0.18, 0.24, profile="highway_with_turns", track_length="Short"),
    Track("rome_roman_tumble",              "Rome — Roman Tumble",                  "Rome",          0.15, 0.33, 0.18, 0.34, profile="jump_heavy",          track_length="Short"),
    Track("rome_roman_byroads",             "Rome — Roman Byroads",                 "Rome",          0.10, 0.33, 0.38, 0.19, profile="twisty_city",         track_length="Short"),
    Track("shanghai_paris_of_east",         "Shanghai — Paris of The East",         "Shanghai",      0.13, 0.23, 0.36, 0.28, profile="twisty_off_road",    track_length="Medium-ish Long"),
    Track("shanghai_double_roundabout",     "Shanghai — Double Roundabout",         "Shanghai",      0.20, 0.27, 0.42, 0.11, profile="twisty_city",         track_length="Long"),
    Track("new_york_wall_street_ride",      "New York — Wall Street Ride",          "New York",      0.38, 0.23, 0.21, 0.18, profile="highway_with_turns", track_length="Medium-ish Long"),
    Track("new_york_run_in_the_park",       "New York — A Run In The Park",         "New York",      0.12, 0.32, 0.39, 0.17, profile="twisty_city",         track_length="Medium-ish Short"),
    Track("nevada_tunnel_sprint",           "Nevada — Tunnel Sprint",               "Nevada",        0.20, 0.30, 0.35, 0.15, profile="tunnel_tight",       track_length="Medium"),
    Track("nevada_bridge_to_bridge",        "Nevada — Bridge to Bridge",            "Nevada",        0.35, 0.25, 0.20, 0.20, profile="highway_with_turns", track_length="Medium"),
    Track("paris_notre_dam",                "Paris — Notre Dam",                    "Paris",         0.15, 0.32, 0.29, 0.24, profile="mixed_circuit",      track_length="Medium-ish Short"),
    Track("paris_along_the_seine",          "Paris — Along the Seine",              "Paris",         0.21, 0.28, 0.31, 0.20, profile="mixed_circuit",      track_length="Medium-ish Long"),
    Track("singapore_urban_rush",           "Singapore — Urban Rush",               "Singapore",     0.18, 0.28, 0.41, 0.13, profile="twisty_city",         track_length="Medium-ish Long"),
    Track("singapore_waterslide_whirl",     "Singapore — Waterslide Whirl",         "Singapore",     0.32, 0.27, 0.19, 0.22, profile="highway_with_turns", track_length="Medium-ish Short"),
]

if __name__ == "__main__":
    data_dir = Path(__file__).parent
    out = data_dir / "tracks.json"
    with out.open("w") as f:
        json.dump([asdict(t) for t in TRACKS], f, indent=2)
    print(f"Wrote {len(TRACKS)} tracks -> {out}")
