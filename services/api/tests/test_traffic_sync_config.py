from app.config import traffic_sync_enabled


def test_traffic_sync_disabled_in_simulate_mode(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://example")
    monkeypatch.setenv("PROVISION_MODE", "simulate")
    monkeypatch.setenv("TRAFFIC_SYNC_ENABLED", "1")
    assert traffic_sync_enabled() is False


def test_traffic_sync_enabled_when_live(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://example")
    monkeypatch.setenv("PROVISION_MODE", "live")
    monkeypatch.setenv("TRAFFIC_SYNC_ENABLED", "1")
    assert traffic_sync_enabled() is True


def test_traffic_sync_can_be_disabled(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://example")
    monkeypatch.setenv("PROVISION_MODE", "live")
    monkeypatch.setenv("TRAFFIC_SYNC_ENABLED", "0")
    assert traffic_sync_enabled() is False
