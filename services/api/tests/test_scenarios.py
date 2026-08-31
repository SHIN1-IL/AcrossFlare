from datetime import datetime, timezone

from app.subscription import resolve_subscription
from tests.fixtures import (
    ACTIVE_STANDARD_ROW,
    EXHAUSTED_STANDARD_ROW,
    EXPIRED_ROW,
    FAILOVER_POOL_ROW,
    FAILOVER_ROW,
    GLOBAL_PRO_ROW,
)


def test_scenario_active_standard_under_limit():
    body, headers = resolve_subscription(ACTIVE_STANDARD_ROW)
    assert "node-la-b.acrossflare.com" in body
    assert "proxies: []" not in body
    assert "total=161061273600" in headers["subscription-userinfo"]


def test_scenario_exhausted_standard_returns_empty_proxies():
    body, headers = resolve_subscription(EXHAUSTED_STANDARD_ROW)
    assert "proxies: []" in body
    assert "subscription-userinfo" in headers


def test_scenario_failover_serves_racknerd_only():
    body, headers = resolve_subscription(FAILOVER_ROW)
    assert "node-la-rn.acrossflare.com" in body
    assert "node-la-b.acrossflare.com" not in body
    assert "; total=0;" in headers["subscription-userinfo"]


def test_scenario_failover_uses_pool_when_racknerd_not_linked():
    body, _headers = resolve_subscription(FAILOVER_POOL_ROW)
    assert "node-la-rn.acrossflare.com" in body
    assert "node-la-b.acrossflare.com" not in body


def test_scenario_expired_subscription_is_blocked_with_headers():
    body, headers = resolve_subscription(
        EXPIRED_ROW,
        now=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    assert "proxies: []" in body
    assert "expire=1577836800" in headers["subscription-userinfo"]


def test_scenario_global_pro_never_blocks_on_traffic():
    body, headers = resolve_subscription(GLOBAL_PRO_ROW)
    assert "node-la-b.acrossflare.com" in body
    assert "; total=0;" in headers["subscription-userinfo"]
