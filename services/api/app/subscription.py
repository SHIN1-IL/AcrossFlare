from datetime import datetime, timezone

from app.headers import karing_headers
from app.nodes import NodeRow, pick_nodes
from app.yaml_builder import build_vless_yaml_with_hint, empty_proxies_yaml


def resolve_subscription(
    row: dict,
    *,
    now: datetime | None = None,
) -> tuple[str, dict[str, str]]:
    uuid = row.get("uuid")
    status = row.get("status")
    expires_at = row.get("expires_at")
    used_gb = float(row.get("traffic_used_gb") or 0)
    limit_gb = row.get("traffic_gb")
    failover = bool(row.get("failover"))
    nodes: list[NodeRow] = row.get("nodes") or []
    pool_nodes: list[NodeRow] = row.get("pool_nodes") or []

    if not uuid or status != "ACTIVE":
        raise ValueError("not_found")

    current = now or datetime.now(timezone.utc)
    expired = bool(expires_at and _as_utc(expires_at) < current)
    over_limit = (
        limit_gb is not None
        and not failover
        and used_gb >= float(limit_gb)
    )

    headers = karing_headers(
        expire_at=expires_at,
        used_gb=used_gb,
        limit_gb=None if failover else limit_gb,
    )

    if expired or over_limit:
        return empty_proxies_yaml(refresh_hint=over_limit), headers

    hosts = pick_nodes(nodes, failover=failover, pool_nodes=pool_nodes)
    if not hosts:
        return empty_proxies_yaml(), headers

    return build_vless_yaml_with_hint(hosts, uuid, refresh_hint=failover), headers


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo:
        return value.astimezone(timezone.utc)
    return value.replace(tzinfo=timezone.utc)
