from datetime import datetime, timezone

from app.failover import FailoverNode, maybe_failover
from app.failover_rules import FailoverSubscription


def test_maybe_failover_provisions_links_and_marks(monkeypatch):
    subscription = FailoverSubscription(
        id="sub-1",
        product="GLOBAL",
        traffic_used_gb=150.0,
        traffic_gb=150.0,
        failover=False,
        expires_at=datetime(2030, 1, 1, tzinfo=timezone.utc),
        uuid="uuid-1",
        xui_email="af_sub1",
    )
    failover_node = FailoverNode(
        id="g-la-rn",
        host="10.0.0.99",
        port=2053,
        username="admin",
        password="secret",
        ddns="node-la-rn.acrossflare.com",
    )

    monkeypatch.setattr("app.failover.load_failover_subscription", lambda conn, sid: subscription)
    monkeypatch.setattr("app.failover.find_failover_nodes", lambda conn, product: [failover_node])
    monkeypatch.setattr("app.failover.provision_live", lambda: True)

    provisioned: list[str] = []
    monkeypatch.setattr(
        "app.failover.add_xui_client",
        lambda session, **kwargs: provisioned.append(kwargs["email"]),
    )
    monkeypatch.setattr("app.failover.login", lambda node: object())

    linked: list[tuple[str, str]] = []
    monkeypatch.setattr(
        "app.failover.link_node_to_subscription",
        lambda conn, node_id, subscription_id: linked.append((node_id, subscription_id)),
    )

    marked: list[str] = []
    monkeypatch.setattr("app.failover.mark_failover", lambda conn, subscription_id: marked.append(subscription_id))

    assert maybe_failover(object(), "sub-1", {}) is True
    assert provisioned == ["af_sub1"]
    assert linked == [("g-la-rn", "sub-1")]
    assert marked == ["sub-1"]


def test_maybe_failover_skips_when_not_eligible(monkeypatch):
    subscription = FailoverSubscription(
        id="sub-pro",
        product="GLOBAL",
        traffic_used_gb=999.0,
        traffic_gb=None,
        failover=False,
        expires_at=datetime(2030, 1, 1, tzinfo=timezone.utc),
        uuid="uuid-pro",
        xui_email="af_pro",
    )
    monkeypatch.setattr("app.failover.load_failover_subscription", lambda conn, sid: subscription)

    assert maybe_failover(object(), "sub-pro", {}) is False


def test_maybe_failover_skips_without_failover_pool(monkeypatch):
    subscription = FailoverSubscription(
        id="sub-1",
        product="GLOBAL",
        traffic_used_gb=150.0,
        traffic_gb=150.0,
        failover=False,
        expires_at=datetime(2030, 1, 1, tzinfo=timezone.utc),
        uuid="uuid-1",
        xui_email="af_sub1",
    )
    monkeypatch.setattr("app.failover.load_failover_subscription", lambda conn, sid: subscription)
    monkeypatch.setattr("app.failover.find_failover_nodes", lambda conn, product: [])

    assert maybe_failover(object(), "sub-1", {}) is False
