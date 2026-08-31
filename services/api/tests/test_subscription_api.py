from tests.fixtures import (
    ACTIVE_STANDARD_ROW,
    EXHAUSTED_STANDARD_ROW,
    FAILOVER_ROW,
    INACTIVE_ROW,
)


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": "true"}


def test_subscription_missing_token_returns_404(client):
    response = client.get("/api/v1/subscription")
    assert response.status_code == 404


def test_subscription_unknown_token_returns_404(client, monkeypatch):
    monkeypatch.setattr("app.main.fetch_subscription_by_token", lambda token: None)
    response = client.get("/api/v1/subscription/unknown-token")
    assert response.status_code == 404


def test_subscription_active_returns_yaml_and_userinfo(client, monkeypatch):
    monkeypatch.setattr("app.main.fetch_subscription_by_token", lambda token: ACTIVE_STANDARD_ROW)
    response = client.get("/api/v1/subscription/demo-token")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/yaml")
    assert "subscription-userinfo" in response.headers
    assert "node-la-b.acrossflare.com" in response.text
    assert "profile-web-page-url" in response.headers


def test_subscription_head_returns_headers_only(client, monkeypatch):
    monkeypatch.setattr("app.main.fetch_subscription_by_token", lambda token: ACTIVE_STANDARD_ROW)
    response = client.head("/api/v1/subscription/demo-token")

    assert response.status_code == 200
    assert response.text == ""
    assert "subscription-userinfo" in response.headers


def test_subscription_exhausted_returns_empty_proxies_not_403(client, monkeypatch):
    monkeypatch.setattr("app.main.fetch_subscription_by_token", lambda token: EXHAUSTED_STANDARD_ROW)
    response = client.get("/api/v1/subscription/demo-token")

    assert response.status_code == 200
    assert "proxies: []" in response.text
    assert "subscription-userinfo" in response.headers


def test_subscription_failover_returns_racknerd_yaml(client, monkeypatch):
    monkeypatch.setattr("app.main.fetch_subscription_by_token", lambda token: FAILOVER_ROW)
    response = client.get("/api/v1/subscription/demo-token")

    assert response.status_code == 200
    assert "node-la-rn.acrossflare.com" in response.text
    assert "node-la-b.acrossflare.com" not in response.text
    assert "; total=0;" in response.headers["subscription-userinfo"]


def test_subscription_query_token_alias(client, monkeypatch):
    monkeypatch.setattr("app.main.fetch_subscription_by_token", lambda token: ACTIVE_STANDARD_ROW)
    response = client.get("/api/v1/subscription?token=query-token")

    assert response.status_code == 200
    assert "node-la-b.acrossflare.com" in response.text


def test_subscription_inactive_status_returns_404(client, monkeypatch):
    monkeypatch.setattr("app.main.fetch_subscription_by_token", lambda token: INACTIVE_ROW)
    response = client.get("/api/v1/subscription/demo-token")
    assert response.status_code == 404
