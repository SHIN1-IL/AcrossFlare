from app.traffic_delta import apply_traffic_reading, delta_bytes


def test_delta_bytes_handles_reset():
    assert delta_bytes(1000, 500) == 500
    assert delta_bytes(1000, 1500) == 500
    assert delta_bytes(0, 100) == 100


def test_apply_traffic_reading_returns_next_raw_values():
    delta, next_up, next_down = apply_traffic_reading(
        previous_up=1_000,
        previous_down=2_000,
        current_up=1_500,
        current_down=2_500,
    )
    assert delta == 1_000
    assert next_up == 1_500
    assert next_down == 2_500


def test_apply_traffic_reading_handles_panel_reset():
    delta, next_up, next_down = apply_traffic_reading(
        previous_up=9_000,
        previous_down=18_000,
        current_up=100,
        current_down=200,
    )
    assert delta == 300
    assert next_up == 100
    assert next_down == 200
