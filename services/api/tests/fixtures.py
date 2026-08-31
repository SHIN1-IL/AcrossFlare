from datetime import datetime, timezone

REALITY_NODE = {
    "ddns": "node-la-b.acrossflare.com",
    "role": "BANDWAGON",
    "vlessPort": 443,
    "realityPublicKey": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "realityShortId": "0123456789",
    "realityServerName": "www.microsoft.com",
    "realityFingerprint": "chrome",
}

ACTIVE_STANDARD_ROW = {
    "uuid": "uuid-active",
    "status": "ACTIVE",
    "expires_at": datetime(2030, 6, 1, tzinfo=timezone.utc),
    "traffic_used_gb": 149.0,
    "failover": False,
    "traffic_gb": 150.0,
    "product": "GLOBAL",
    "nodes": [REALITY_NODE],
    "pool_nodes": [],
}

EXHAUSTED_STANDARD_ROW = {
    **ACTIVE_STANDARD_ROW,
    "traffic_used_gb": 150.0,
}

FAILOVER_ROW = {
    **ACTIVE_STANDARD_ROW,
    "traffic_used_gb": 150.0,
    "failover": True,
    "nodes": [
        REALITY_NODE,
        {**REALITY_NODE, "ddns": "node-la-rn.acrossflare.com", "role": "RACKNERD"},
    ],
}

FAILOVER_POOL_ROW = {
    **ACTIVE_STANDARD_ROW,
    "traffic_used_gb": 150.0,
    "failover": True,
    "nodes": [REALITY_NODE],
    "pool_nodes": [{**REALITY_NODE, "ddns": "node-la-rn.acrossflare.com", "role": "RACKNERD"}],
}

EXPIRED_ROW = {
    **ACTIVE_STANDARD_ROW,
    "expires_at": datetime(2020, 1, 1, tzinfo=timezone.utc),
}

GLOBAL_PRO_ROW = {
    **ACTIVE_STANDARD_ROW,
    "traffic_gb": None,
    "traffic_used_gb": 500.0,
}

INACTIVE_ROW = {
    **ACTIVE_STANDARD_ROW,
    "status": "PROVISIONING",
}
