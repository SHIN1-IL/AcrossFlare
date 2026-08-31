import pytest

from app.traffic_sync import SyncRow, run_traffic_sync


class FakeConnection:
    def commit(self) -> None:
        return None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


@pytest.fixture
def sync_row() -> SyncRow:
    return SyncRow(
        subscription_id="sub-1",
        traffic_used_gb=149.0,
        xui_email="af_demo",
        node_id="g-la-b-bw",
        node_host="10.0.0.55",
        node_port=2053,
        node_username="admin",
        node_password="secret",
    )


def test_run_traffic_sync_applies_delta_and_checks_failover(monkeypatch, db_url, sync_row):
    monkeypatch.setattr("app.traffic_sync.load_sync_rows", lambda: [sync_row])
    monkeypatch.setattr("app.traffic_sync._session_for_node", lambda sessions, entry: object())
    monkeypatch.setattr("app.traffic_sync.fetch_client_traffic", lambda session, email: (1_000, 2_000))
    monkeypatch.setattr("app.traffic_sync._apply_snapshot", lambda conn, entry, up, down: 3_000)
    monkeypatch.setattr("app.traffic_sync._mark_node_degraded", lambda *args: None)

    incremented: list[tuple[str, int]] = []
    monkeypatch.setattr(
        "app.traffic_sync._increment_traffic_used_gb",
        lambda conn, subscription_id, delta_bytes: incremented.append((subscription_id, delta_bytes)),
    )

    failovers: list[str] = []
    monkeypatch.setattr(
        "app.traffic_sync.maybe_failover",
        lambda conn, subscription_id, sessions: failovers.append(subscription_id) or False,
    )
    monkeypatch.setattr("app.traffic_sync.psycopg.connect", lambda url: FakeConnection())
    monkeypatch.setattr("app.traffic_sync._record_sync_run", lambda *args: None)

    result = run_traffic_sync()

    assert result == {"subscriptions": 1, "updates": 1, "failovers": 0, "errors": 0}
    assert incremented == [("sub-1", 3_000)]
    assert failovers == ["sub-1"]


def test_run_traffic_sync_marks_degraded_when_all_nodes_fail(monkeypatch, db_url, sync_row):
    from app.xui_client import XuiError

    monkeypatch.setattr("app.traffic_sync.load_sync_rows", lambda: [sync_row])

    def raise_panel_error(_sessions, _entry):
        raise XuiError("panel_down")

    monkeypatch.setattr("app.traffic_sync._session_for_node", raise_panel_error)
    monkeypatch.setattr("app.traffic_sync.maybe_failover", lambda *args: False)

    degraded: list[str] = []
    monkeypatch.setattr(
        "app.traffic_sync._mark_node_degraded",
        lambda conn, node_id: degraded.append(node_id),
    )
    monkeypatch.setattr("app.traffic_sync.psycopg.connect", lambda url: FakeConnection())
    monkeypatch.setattr("app.traffic_sync._record_sync_run", lambda *args: None)

    result = run_traffic_sync()

    assert result["errors"] == 1
    assert degraded == ["g-la-b-bw"]


def test_run_traffic_sync_records_failover(monkeypatch, db_url, sync_row):
    monkeypatch.setattr("app.traffic_sync.load_sync_rows", lambda: [sync_row])
    monkeypatch.setattr("app.traffic_sync._session_for_node", lambda sessions, entry: object())
    monkeypatch.setattr("app.traffic_sync.fetch_client_traffic", lambda session, email: (0, 0))
    monkeypatch.setattr("app.traffic_sync._apply_snapshot", lambda *args: 0)
    monkeypatch.setattr("app.traffic_sync._increment_traffic_used_gb", lambda *args: None)
    monkeypatch.setattr("app.traffic_sync._mark_node_degraded", lambda *args: None)
    monkeypatch.setattr("app.traffic_sync.maybe_failover", lambda *args: True)
    monkeypatch.setattr("app.traffic_sync.psycopg.connect", lambda url: FakeConnection())
    monkeypatch.setattr("app.traffic_sync._record_sync_run", lambda *args: None)

    result = run_traffic_sync()

    assert result["failovers"] == 1
