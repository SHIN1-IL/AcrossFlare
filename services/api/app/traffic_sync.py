import logging
import secrets
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import psycopg

from app.config import DATABASE_URL
from app.failover import maybe_failover
from app.traffic_delta import apply_traffic_reading
from app.xui_client import XuiError, XuiPanelTarget, XuiSession, fetch_client_traffic, login

logger = logging.getLogger(__name__)

BYTES_PER_GB = 1024**3
SYNC_RUN_RETENTION_DAYS = 30


@dataclass(frozen=True)
class SyncRow:
    subscription_id: str
    traffic_used_gb: float
    xui_email: str
    node_id: str
    node_host: str
    node_port: int
    node_username: str
    node_password: str


def run_traffic_sync() -> dict[str, int]:
    if not DATABASE_URL:
        logger.warning("traffic_sync_skipped: database_unconfigured")
        return {"subscriptions": 0, "updates": 0, "failovers": 0, "errors": 0}

    started_at = datetime.now(UTC)
    started_ms = time.monotonic()

    rows = load_sync_rows()
    if not rows:
        result = {"subscriptions": 0, "updates": 0, "failovers": 0, "errors": 0}
        _record_sync_run(started_at, started_ms, result)
        return result

    sessions: dict[str, XuiSession] = {}
    grouped: dict[str, list[SyncRow]] = {}
    for row in rows:
        grouped.setdefault(row.subscription_id, []).append(row)

    updates = 0
    errors = 0
    failovers = 0

    with psycopg.connect(DATABASE_URL) as conn:
        for subscription_id, entries in grouped.items():
            subscription_errors = 0
            delta_bytes = 0

            for entry in entries:
                try:
                    session = _session_for_node(sessions, entry)
                    up, down = fetch_client_traffic(session, entry.xui_email)
                    delta_bytes += _apply_snapshot(conn, entry, up, down)
                except XuiError as exc:
                    subscription_errors += 1
                    logger.warning(
                        "traffic_sync_node_failed subscription=%s node=%s error=%s",
                        subscription_id,
                        entry.node_id,
                        exc,
                    )
                except Exception:
                    subscription_errors += 1
                    logger.exception(
                        "traffic_sync_node_failed subscription=%s node=%s",
                        subscription_id,
                        entry.node_id,
                    )

            if delta_bytes > 0:
                _increment_traffic_used_gb(conn, subscription_id, delta_bytes)
                updates += 1

            if maybe_failover(conn, subscription_id, sessions):
                failovers += 1

            if subscription_errors == len(entries) and entries:
                _mark_node_degraded(conn, entries[0].node_id)

            errors += subscription_errors

        conn.commit()

    logger.info(
        "traffic_sync_complete subscriptions=%s updates=%s failovers=%s errors=%s",
        len(grouped),
        updates,
        failovers,
        errors,
    )
    result = {"subscriptions": len(grouped), "updates": updates, "failovers": failovers, "errors": errors}
    _record_sync_run(started_at, started_ms, result)
    return result


def _record_sync_run(started_at: datetime, started_ms: float, result: dict[str, int]) -> None:
    if not DATABASE_URL:
        return

    completed_at = datetime.now(UTC)
    duration_ms = max(0, int((time.monotonic() - started_ms) * 1000))
    cutoff = completed_at - timedelta(days=SYNC_RUN_RETENTION_DAYS)

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "TrafficSyncRun" (
                  id, "startedAt", "completedAt",
                  subscriptions, updates, failovers, errors, "durationMs"
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    secrets.token_hex(12),
                    started_at,
                    completed_at,
                    result["subscriptions"],
                    result["updates"],
                    result["failovers"],
                    result["errors"],
                    duration_ms,
                ),
            )
            cur.execute(
                """
                DELETE FROM "TrafficSyncRun"
                WHERE "completedAt" < %s
                """,
                (cutoff,),
            )
        conn.commit()


def load_sync_rows() -> list[SyncRow]:
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  s.id,
                  s."trafficUsedGb",
                  c."xuiEmail",
                  n.id,
                  n.host,
                  n.port,
                  n.username,
                  n.password
                FROM "Subscription" s
                JOIN "Credential" c ON c."subscriptionId" = s.id
                JOIN "_NodeToSubscription" ns ON ns."B" = s.id
                JOIN "Node" n ON n.id = ns."A"
                WHERE s.status = 'ACTIVE'
                  AND c."xuiEmail" IS NOT NULL
                  AND s.product IN ('GLOBAL', 'MARKETING')
                  AND n.status <> 'OFFLINE'
                ORDER BY s.id, n."createdAt"
                """
            )
            fetched = cur.fetchall()

    return [
        SyncRow(
            subscription_id=row[0],
            traffic_used_gb=float(row[1] or 0),
            xui_email=row[2],
            node_id=row[3],
            node_host=row[4],
            node_port=int(row[5]),
            node_username=row[6],
            node_password=row[7],
        )
        for row in fetched
    ]


def _session_for_node(sessions: dict[str, XuiSession], entry: SyncRow) -> XuiSession:
    cached = sessions.get(entry.node_id)
    if cached:
        return cached

    session = login(
        XuiPanelTarget(
            id=entry.node_id,
            host=entry.node_host,
            port=entry.node_port,
            username=entry.node_username,
            password=entry.node_password,
        )
    )
    sessions[entry.node_id] = session
    return session


def _apply_snapshot(conn: psycopg.Connection, entry: SyncRow, up: int, down: int) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT "rawUp", "rawDown"
            FROM "TrafficSnapshot"
            WHERE "subscriptionId" = %s AND "nodeId" = %s
            LIMIT 1
            """,
            (entry.subscription_id, entry.node_id),
        )
        row = cur.fetchone()

    previous_up = int(row[0]) if row else 0
    previous_down = int(row[1]) if row else 0
    delta, next_up, next_down = apply_traffic_reading(
        previous_up=previous_up,
        previous_down=previous_down,
        current_up=up,
        current_down=down,
    )

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "TrafficSnapshot" (
              id, "subscriptionId", "nodeId", "rawUp", "rawDown", "updatedAt"
            )
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT ("subscriptionId", "nodeId")
            DO UPDATE SET
              "rawUp" = EXCLUDED."rawUp",
              "rawDown" = EXCLUDED."rawDown",
              "updatedAt" = NOW()
            """,
            (
                secrets.token_hex(12),
                entry.subscription_id,
                entry.node_id,
                next_up,
                next_down,
            ),
        )

    return delta


def _increment_traffic_used_gb(conn: psycopg.Connection, subscription_id: str, delta_bytes: int) -> None:
    delta_gb = delta_bytes / BYTES_PER_GB
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "Subscription"
            SET "trafficUsedGb" = "trafficUsedGb" + %s,
                "updatedAt" = NOW()
            WHERE id = %s
            """,
            (delta_gb, subscription_id),
        )


def _mark_node_degraded(conn: psycopg.Connection, node_id: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "Node"
            SET status = 'DEGRADED',
                "updatedAt" = NOW()
            WHERE id = %s AND status = 'ONLINE'
            """,
            (node_id,),
        )
