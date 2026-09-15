from datetime import datetime, timezone

import pytest

from app.config import VLESS_CLIENT_FLOW
from app.nodes import pick_hosts, pick_nodes
from app.subscription import resolve_subscription
from app.yaml_builder import build_vless_yaml, empty_proxies_yaml
from tests.fixtures import decoded_sub

REALITY_NODE = {
    "ddns": "node-la-b.acrossflare.com",
    "role": "BANDWAGON",
    "vlessPort": 443,
    "realityPublicKey": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "realityShortId": "0123456789",
    "realityServerName": "www.microsoft.com",
    "realityFingerprint": "chrome",
}


def test_pick_hosts_prefers_bandwagon_when_not_failover():
    nodes = [
        REALITY_NODE,
        {**REALITY_NODE, "ddns": "node-la-rn.acrossflare.com", "role": "RACKNERD"},
    ]
    assert pick_hosts(nodes, failover=False) == ["node-la-b.acrossflare.com"]


def test_pick_hosts_uses_racknerd_when_failover():
    nodes = [
        REALITY_NODE,
        {**REALITY_NODE, "ddns": "node-la-rn.acrossflare.com", "role": "RACKNERD"},
    ]
    assert pick_hosts(nodes, failover=True) == ["node-la-rn.acrossflare.com"]


def test_build_vless_yaml_matches_karing_reality_shape():
    yaml = build_vless_yaml([REALITY_NODE], "uuid-1")
    assert "type: vless" in yaml
    assert "server: node-la-b.acrossflare.com" in yaml
    assert "uuid: uuid-1" in yaml
    assert "network: tcp" in yaml
    assert "tls: true" in yaml
    assert "tls: false" not in yaml
    assert f"flow: {VLESS_CLIENT_FLOW}" in yaml
    assert "reality-opts:" in yaml
    assert "public-key:" in yaml
    assert "servername: www.microsoft.com" in yaml
    assert "client-fingerprint: chrome" in yaml
    assert "#profile-web-page-url:" in yaml


def test_build_vless_uri_list_enables_reality():
    from app.yaml_builder import build_vless_uri_list

    body = build_vless_uri_list([REALITY_NODE], "uuid-1")
    assert body.startswith("vless://uuid-1@node-la-b.acrossflare.com:443?")
    assert "security=reality" in body
    assert "sni=www.microsoft.com" in body
    assert f"flow={VLESS_CLIENT_FLOW}" in body
    assert "pbk=" in body


def test_build_vless_uri_uses_panel_ipv4():
    from app.yaml_builder import build_vless_uri_list

    body = build_vless_uri_list([{**REALITY_NODE, "host": "https://45.78.71.200:2053"}], "uuid-1")
    assert body.startswith("vless://uuid-1@45.78.71.200:443?")
    assert "node-la-b.acrossflare.com" not in body.split("?", 1)[0]


def test_resolve_subscription_vless_flag_returns_uris():
    row = {
        "uuid": "uuid-1",
        "status": "ACTIVE",
        "expires_at": datetime(2030, 1, 1, tzinfo=timezone.utc),
        "traffic_used_gb": 10.0,
        "failover": False,
        "traffic_gb": 150.0,
        "nodes": [REALITY_NODE],
    }
    body, _headers = resolve_subscription(row, fmt="vless")
    assert decoded_sub(body).startswith("vless://")
    assert "security=reality" in decoded_sub(body)
    assert "proxies:" not in decoded_sub(body)


def test_empty_proxies_yaml_is_blocked_payload():
    yaml = empty_proxies_yaml()
    assert "proxies: []" in yaml
    assert "#profile-web-page-url:" in yaml


def test_resolve_subscription_returns_empty_proxies_when_expired():
    row = {
        "uuid": "uuid-1",
        "status": "ACTIVE",
        "expires_at": datetime(2020, 1, 1, tzinfo=timezone.utc),
        "traffic_used_gb": 1.0,
        "failover": False,
        "traffic_gb": 100.0,
        "nodes": [REALITY_NODE],
    }
    body, headers = resolve_subscription(row, now=datetime(2026, 1, 1, tzinfo=timezone.utc))
    assert "proxies: []" in body
    body_clash, _ = resolve_subscription(row, now=datetime(2026, 1, 1, tzinfo=timezone.utc), fmt="clash")
    assert "proxies: []" in body_clash
    assert "subscription-userinfo" in headers
    assert "expire=" in headers["subscription-userinfo"]


def test_resolve_subscription_returns_empty_proxies_when_over_limit():
    row = {
        "uuid": "uuid-1",
        "status": "ACTIVE",
        "expires_at": datetime(2030, 1, 1, tzinfo=timezone.utc),
        "traffic_used_gb": 150.0,
        "failover": False,
        "traffic_gb": 150.0,
        "nodes": [REALITY_NODE],
    }
    body, headers = resolve_subscription(row)
    assert "proxies: []" in body
    body_clash, _ = resolve_subscription(row, fmt="clash")
    assert "proxies: []" in body_clash
    assert "서브스크립션 수동 업데이트" in body_clash
    assert headers["subscription-userinfo"].startswith("upload=0; download=")


def test_resolve_subscription_returns_yaml_when_active():
    row = {
        "uuid": "uuid-1",
        "status": "ACTIVE",
        "expires_at": datetime(2030, 1, 1, tzinfo=timezone.utc),
        "traffic_used_gb": 10.0,
        "failover": False,
        "traffic_gb": 150.0,
        "nodes": [REALITY_NODE],
    }
    body, headers = resolve_subscription(row)
    plain = decoded_sub(body)
    assert "reality-opts:" in plain
    assert "node-la-b.acrossflare.com" in plain
    assert "AcrossFlare.yaml" in headers["content-disposition"]
    yaml_body, _ = resolve_subscription(row, fmt="clash")
    assert "reality-opts:" in yaml_body
    assert "subscription-userinfo" in headers


def test_resolve_subscription_failover_uses_unlimited_total():
    row = {
        "uuid": "uuid-1",
        "status": "ACTIVE",
        "expires_at": datetime(2030, 1, 1, tzinfo=timezone.utc),
        "traffic_used_gb": 150.0,
        "failover": True,
        "traffic_gb": 150.0,
        "nodes": [
            REALITY_NODE,
            {**REALITY_NODE, "ddns": "node-la-rn.acrossflare.com", "role": "RACKNERD"},
        ],
        "pool_nodes": [],
    }
    body, headers = resolve_subscription(row)
    plain = decoded_sub(body)
    assert "node-la-rn.acrossflare.com" in plain
    assert "node-la-b.acrossflare.com" not in plain
    assert "reality-opts:" in plain
    yaml_body, _ = resolve_subscription(row, fmt="clash")
    assert "서브스크립션 수동 업데이트" in yaml_body
    assert "; total=0;" in headers["subscription-userinfo"]


def test_resolve_subscription_failover_uses_pool_nodes():
    row = {
        "uuid": "uuid-1",
        "status": "ACTIVE",
        "expires_at": datetime(2030, 1, 1, tzinfo=timezone.utc),
        "traffic_used_gb": 150.0,
        "failover": True,
        "traffic_gb": 150.0,
        "nodes": [REALITY_NODE],
        "pool_nodes": [{**REALITY_NODE, "ddns": "node-la-rn.acrossflare.com", "role": "RACKNERD"}],
    }
    body, headers = resolve_subscription(row)
    plain = decoded_sub(body)
    assert "node-la-rn.acrossflare.com" in plain
    assert "node-la-b.acrossflare.com" not in plain
    assert "; total=0;" in headers["subscription-userinfo"]


def test_resolve_subscription_raises_for_missing_uuid():
    with pytest.raises(ValueError, match="not_found"):
        resolve_subscription({"uuid": None, "status": "ACTIVE", "nodes": []})


def test_pick_nodes_returns_full_rows():
    nodes = [
        REALITY_NODE,
        {**REALITY_NODE, "ddns": "node-la-rn.acrossflare.com", "role": "RACKNERD"},
    ]
    picked = pick_nodes(nodes, failover=True)
    assert picked[0]["ddns"] == "node-la-rn.acrossflare.com"
    assert picked[0]["realityPublicKey"]
