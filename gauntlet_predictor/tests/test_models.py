from src.storage import load_tracks


def test_all_weights_sum_to_one() -> None:
    tracks = load_tracks()
    assert len(tracks) == 36
    for track in tracks:
        total = track.w_top_speed + track.w_acceleration + track.w_handling + track.w_nitro
        assert abs(total - 1.0) <= 0.001, f"{track.id}: weights sum to {total:.4f}"


def test_all_tracks_have_profile() -> None:
    tracks = load_tracks()
    for track in tracks:
        assert track.profile != "", f"{track.id} has empty profile"


def test_all_tracks_have_length() -> None:
    tracks = load_tracks()
    for track in tracks:
        assert track.track_length != "", f"{track.id} has empty track_length"


def test_short_tracks_penalise_top_speed() -> None:
    tracks = load_tracks()
    short_tracks = [t for t in tracks if t.track_length == "Short"]
    assert short_tracks, "No Short tracks found"
    for track in short_tracks:
        assert track.w_top_speed <= 0.40, (
            f"{track.id}: w_top_speed={track.w_top_speed} exceeds 0.40"
        )


def test_long_twisty_city_handling() -> None:
    tracks = load_tracks()
    long_twisty = [t for t in tracks if t.profile == "twisty_city" and t.track_length == "Long"]
    assert long_twisty, "No Long twisty_city tracks found"
    for track in long_twisty:
        assert track.w_handling >= 0.40, (
            f"{track.id}: w_handling={track.w_handling} below 0.40"
        )


def test_himalayas_leap_is_pure_straight() -> None:
    tracks = load_tracks()
    track = next(t for t in tracks if t.id == "himalayas_leap_of_faith")
    assert track.profile == "pure_straight"


def test_singapore_waterslide_is_highway() -> None:
    tracks = load_tracks()
    track = next(t for t in tracks if t.id == "singapore_waterslide_whirl")
    assert track.profile == "highway_with_turns"


def test_auckland_straight_is_mixed() -> None:
    tracks = load_tracks()
    track = next(t for t in tracks if t.id == "auckland_straight_sprint")
    assert track.profile == "mixed_circuit"
