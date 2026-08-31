from datetime import datetime, timezone

from app.failover_rules import FailoverSubscription, should_failover
from app.nodes import pick_hosts


def test_should_failover_only_for_global_with_limit():
    base = FailoverSubscription(
        id="sub-1",
        product="GLOBAL",
        traffic_used_gb=150.0,
        traffic_gb=150.0,
        failover=False,
        expires_at=datetime(2030, 1, 1, tzinfo=timezone.utc),
        uuid="uuid-1",
        xui_email="af_test",
    )
    assert should_failover(base) is True

    assert should_failover(FailoverSubscription(**{**base.__dict__, "product": "MARKETING"})) is False
    assert should_failover(FailoverSubscription(**{**base.__dict__, "failover": True})) is False
    assert should_failover(FailoverSubscription(**{**base.__dict__, "traffic_gb": None})) is False
    assert should_failover(FailoverSubscription(**{**base.__dict__, "traffic_used_gb": 149.0})) is False


def test_pick_hosts_uses_pool_when_failover_without_assigned_racknerd():
    nodes = [{"ddns": "node-la-b.acrossflare.com", "role": "BANDWAGON"}]
    pool = [{"ddns": "node-la-rn.acrossflare.com", "role": "RACKNERD"}]
    assert pick_hosts(nodes, failover=True, pool_nodes=pool) == ["node-la-rn.acrossflare.com"]
