import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.modules.setdefault("psycopg", MagicMock())


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("TRAFFIC_SYNC_ENABLED", "0")
    monkeypatch.setenv("PROVISION_MODE", "simulate")
    monkeypatch.delenv("DATABASE_URL", raising=False)

    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_url(monkeypatch):
    url = "postgresql://test/test"
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setattr("app.traffic_sync.DATABASE_URL", url)
    monkeypatch.setattr("app.db.DATABASE_URL", url)
    return url
