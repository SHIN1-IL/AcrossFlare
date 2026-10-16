import re
from typing import Any, TypedDict

from app.config import DEFAULT_VLESS_PORT

_IPV4 = re.compile(r"(?:https?://)?(\d{1,3}(?:\.\d{1,3}){3})")

# Logical roles (provider/vendor is irrelevant for YAML routing).
ROLE_PRIMARY = "PRIMARY"
ROLE_FAILOVER = "FAILOVER"


class NodeRow(TypedDict, total=False):
    ddns: str
    host: str | None
    role: str
    vlessPort: int
    realityPublicKey: str | None
    realityShortId: str | None
    realityServerName: str | None
    realityFingerprint: str | None


def vless_connect_host(node: NodeRow) -> str:
    match = _IPV4.search((node.get("host") or "").strip())
    if match:
        return match.group(1)
    return (node.get("ddns") or "").strip()


def has_reality_config(node: NodeRow) -> bool:
    return bool((node.get("realityPublicKey") or "").strip() and (node.get("realityServerName") or "").strip())


def pick_nodes(
    nodes: list[NodeRow],
    *,
    failover: bool,
    pool_nodes: list[NodeRow] | None = None,
) -> list[NodeRow]:
    if not nodes and not pool_nodes:
        return []

    if failover:
        failover_nodes = [node for node in nodes if node.get("role") == ROLE_FAILOVER]
        if failover_nodes:
            return failover_nodes
        pool = pool_nodes or []
        pool_failover = [node for node in pool if node.get("role") == ROLE_FAILOVER]
        if pool_failover:
            return pool_failover
        return list(nodes)

    primary = [node for node in nodes if node.get("role") == ROLE_PRIMARY]
    return primary or list(nodes)


def pick_hosts(
    nodes: list[NodeRow],
    *,
    failover: bool,
    pool_nodes: list[NodeRow] | None = None,
) -> list[str]:
    return [node["ddns"] for node in pick_nodes(nodes, failover=failover, pool_nodes=pool_nodes)]


def node_row_from_db(row: dict[str, Any]) -> NodeRow:
    return {
        "ddns": str(row.get("ddns") or ""),
        "host": row.get("host"),
        "role": str(row.get("role") or ""),
        "vlessPort": int(row.get("vlessPort") or DEFAULT_VLESS_PORT),
        "realityPublicKey": row.get("realityPublicKey"),
        "realityShortId": row.get("realityShortId"),
        "realityServerName": row.get("realityServerName"),
        "realityFingerprint": row.get("realityFingerprint"),
    }
