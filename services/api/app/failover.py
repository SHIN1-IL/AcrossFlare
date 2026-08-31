import logging
from dataclasses import dataclass
from datetime import datetime

import psycopg

from app.config import provision_live
from app.failover_rules import FailoverSubscription, should_failover
from app.xui_client import XuiError, XuiPanelTarget, XuiSession, add_xui_client, login

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class FailoverNode:
    id: str
    host: str
    port: int
    username: str
    password: str
    ddns: str


def maybe_failover(
    conn: psycopg.Connection,
    subscription_id: str,
    sessions: dict[str, XuiSession],
) -> bool:
    subscription = load_failover_subscription(conn, subscription_id)
    if not subscription or not should_failover(subscription):
        return False

    nodes = find_racknerd_nodes(conn, subscription.product)
    if not nodes:
        logger.warning("failover_skipped subscription=%s reason=no_racknerd_node", subscription_id)
        return False

    if provision_live():
        for node in nodes:
            try:
                session = _session_for_node(sessions, node)
                add_xui_client(
                    session,
                    uuid=subscription.uuid,
                    email=subscription.xui_email,
                    expires_at=subscription.expires_at,
                    traffic_gb=None,
                )
            except XuiError as exc:
                logger.warning(
                    "failover_provision_failed subscription=%s node=%s error=%s",
                    subscription_id,
                    node.id,
                    exc,
                )

    for node in nodes:
        link_node_to_subscription(conn, node.id, subscription_id)

    mark_failover(conn, subscription_id)
    logger.info(
        "failover_applied subscription=%s racknerd_nodes=%s",
        subscription_id,
        [node.id for node in nodes],
    )
    return True


def load_failover_subscription(conn: psycopg.Connection, subscription_id: str) -> FailoverSubscription | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
              s.id,
              s.product::text,
              s."trafficUsedGb",
              p."trafficGb",
              s.failover,
              s."expiresAt",
              c.uuid,
              c."xuiEmail"
            FROM "Subscription" s
            JOIN "Plan" p ON p.id = s."planId"
            JOIN "Credential" c ON c."subscriptionId" = s.id
            WHERE s.id = %s
              AND s.status = 'ACTIVE'
            LIMIT 1
            """,
            (subscription_id,),
        )
        row = cur.fetchone()

    if not row or not row[6] or not row[7]:
        return None

    return FailoverSubscription(
        id=row[0],
        product=row[1],
        traffic_used_gb=float(row[2] or 0),
        traffic_gb=float(row[3]) if row[3] is not None else None,
        failover=bool(row[4]),
        expires_at=row[5],
        uuid=row[6],
        xui_email=row[7],
    )


def find_racknerd_nodes(conn: psycopg.Connection, product: str) -> list[FailoverNode]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, host, port, username, password, ddns
            FROM "Node"
            WHERE product = %s
              AND role = 'RACKNERD'
              AND status <> 'OFFLINE'
            ORDER BY "createdAt" ASC
            """,
            (product,),
        )
        rows = cur.fetchall()

    return [
        FailoverNode(
            id=row[0],
            host=row[1],
            port=int(row[2]),
            username=row[3],
            password=row[4],
            ddns=row[5],
        )
        for row in rows
    ]


def fetch_racknerd_pool(conn: psycopg.Connection, product: str) -> list[dict[str, str | int | None]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
              ddns,
              role::text,
              "vlessPort",
              "realityPublicKey",
              "realityShortId",
              "realityServerName",
              "realityFingerprint"
            FROM "Node"
            WHERE product = %s
              AND role = 'RACKNERD'
              AND status <> 'OFFLINE'
            ORDER BY "createdAt" ASC
            """,
            (product,),
        )
        rows = cur.fetchall()

    return [
        {
            "ddns": row[0],
            "role": row[1],
            "vlessPort": row[2],
            "realityPublicKey": row[3],
            "realityShortId": row[4],
            "realityServerName": row[5],
            "realityFingerprint": row[6],
        }
        for row in rows
    ]


def link_node_to_subscription(conn: psycopg.Connection, node_id: str, subscription_id: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "_NodeToSubscription" ("A", "B")
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            """,
            (node_id, subscription_id),
        )


def mark_failover(conn: psycopg.Connection, subscription_id: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "Subscription"
            SET failover = TRUE,
                "updatedAt" = NOW()
            WHERE id = %s
            """,
            (subscription_id,),
        )


def _session_for_node(sessions: dict[str, XuiSession], node: FailoverNode) -> XuiSession:
    cached = sessions.get(node.id)
    if cached:
        return cached

    session = login(
        XuiPanelTarget(
            id=node.id,
            host=node.host,
            port=node.port,
            username=node.username,
            password=node.password,
        )
    )
    sessions[node.id] = session
    return session
