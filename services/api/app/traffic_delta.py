def delta_bytes(previous: int, current: int) -> int:
    """Return safe increment when 3x-ui counters reset to zero."""
    if current < previous:
        return current
    return current - previous


def apply_traffic_reading(
    *,
    previous_up: int,
    previous_down: int,
    current_up: int,
    current_down: int,
) -> tuple[int, int, int]:
    delta_up = delta_bytes(previous_up, current_up)
    delta_down = delta_bytes(previous_down, current_down)
    return delta_up + delta_down, current_up, current_down
