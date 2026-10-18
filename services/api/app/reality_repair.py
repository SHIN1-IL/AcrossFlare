import logging
from typing import Any

import psycopg

from app.config import DATABASE_URL
from app.reality_keys import reality_key_for_client
from app.xui_client import XuiPanelTarget, as_json_obj, login, panel_request, persist_reality_karing_fix

logger = logging.getLogger(__name__)


def repair_subscription_reality_keys(row: dict[str, Any]) -> None:
    """Rewrite panel private keys once, then store the client public key without padding.

    Karing refuses standard base64 (`=` at byte 43) before it even dials the node.
    Xray on the VPS uses the same decoder for `privateKey`, so the panel copy has to move too.
    """
    nodes = [*(row.get("nodes") or []), *(row.get("pool_nodes") or [])]
    pending: list[dict[str, Any]] = []
    seen: set[str] = set()
    for node in nodes:
        if not isinstance(node, dict):
            continue
        ddns = str(node.get("ddns") or "").strip()
        stored = str(node.get("realityPublicKey") or "").strip()
        if not ddns or not stored or ddns in seen:
            continue
        if reality_key_for_client(stored) == stored:
            continue
        seen.add(ddns)
        pending.append(node)
    if not pending or not DATABASE_URL:
        return

    for node in pending:
        node_id = str(node.get("id") or "").strip()
        ddns = str(node.get("ddns") or "").strip()
        stored = str(node.get("realityPublicKey") or "").strip()
        if not node_id:
            canonical = reality_key_for_client(stored)
            if canonical:
                node["realityPublicKey"] = canonical
            continue
        try:
            canonical = _repair_node(node_id, stored)
        except Exception as exc:
            logger.warning("reality_key_repair_failed ddns=%s error=%s", ddns, type(exc).__name__)
            continue
        if not canonical:
            continue
        node["realityPublicKey"] = canonical


def _repair_node(node_id: str, stored: str) -> str | None:
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, host, port, username, password, "inboundId"
                FROM "Node"
                WHERE id = %s
                """,
                (node_id,),
            )
            found = cur.fetchone()
    if not found:
        return None

    node_id, host, port, username, password, inbound_id = found
    session = login(
        XuiPanelTarget(
            id=str(node_id),
            host=str(host or ""),
            port=int(port or 0),
            username=str(username or ""),
            password=str(password or ""),
        )
    )
    listed = panel_request(session, "/panel/api/inbounds/list") or {}
    inbound = _pick_inbound(listed.get("obj") or [], inbound_id)
    if not isinstance(inbound, dict):
        return None

    panel_public = persist_reality_karing_fix(session, inbound)
    db_canonical = reality_key_for_client(stored)
    if panel_public and db_canonical and panel_public != db_canonical:
        logger.warning("reality_public_key_mismatch node=%s", node_id)
    if db_canonical and db_canonical != stored:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE "Node"
                    SET "realityPublicKey" = %s, "updatedAt" = NOW()
                    WHERE id = %s AND "realityPublicKey" = %s
                    """,
                    (db_canonical, node_id, stored),
                )
    return db_canonical or None


def _pick_inbound(rows: Any, inbound_id: Any) -> dict[str, Any] | None:
    fallback: dict[str, Any] | None = None
    if not isinstance(rows, list):
        return None
    for item in rows:
        if not isinstance(item, dict):
            continue
        if "vless" not in str(item.get("protocol") or "").lower():
            continue
        stream = as_json_obj(item.get("streamSettings"))
        if str(stream.get("security") or "").lower() != "reality":
            continue
        if inbound_id is not None and item.get("id") == inbound_id:
            return item
        if fallback is None:
            fallback = item
    return fallback
