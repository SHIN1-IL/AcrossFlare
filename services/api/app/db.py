from typing import Any

import psycopg
from fastapi import HTTPException

from app.config import DATABASE_URL
from app.failover import fetch_racknerd_pool


def fetch_subscription_by_token(token: str) -> dict[str, Any] | None:
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="database_unconfigured")

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  c.uuid,
                  s.status::text,
                  s."expiresAt",
                  s."trafficUsedGb",
                  s.failover,
                  p."trafficGb",
                  s.product::text,
                  COALESCE(
                    json_agg(
                      json_build_object(
                        'ddns', n.ddns,
                        'role', n.role::text,
                        'vlessPort', n."vlessPort",
                        'realityPublicKey', n."realityPublicKey",
                        'realityShortId', n."realityShortId",
                        'realityServerName', n."realityServerName",
                        'realityFingerprint', n."realityFingerprint"
                      )
                      ORDER BY n."createdAt"
                    ) FILTER (WHERE n.id IS NOT NULL),
                    '[]'::json
                  ) AS nodes
                FROM "Credential" c
                JOIN "Subscription" s ON s.id = c."subscriptionId"
                JOIN "Plan" p ON p.id = s."planId"
                LEFT JOIN "_NodeToSubscription" ns ON ns."B" = s.id
                LEFT JOIN "Node" n ON n.id = ns."A"
                WHERE c."yamlToken" = %s
                GROUP BY
                  c.uuid,
                  s.status,
                  s."expiresAt",
                  s."trafficUsedGb",
                  s.failover,
                  p."trafficGb",
                  s.product
                LIMIT 1
                """,
                (token,),
            )
            row = cur.fetchone()

        if not row:
            return None

        nodes = row[7]
        if not isinstance(nodes, list):
            nodes = []

        product = row[6]
        failover = bool(row[4])
        pool_nodes: list[dict[str, str]] = []
        if failover and not any(node.get("role") == "RACKNERD" for node in nodes):
            pool_nodes = fetch_racknerd_pool(conn, product)

    return {
        "uuid": row[0],
        "status": row[1],
        "expires_at": row[2],
        "traffic_used_gb": float(row[3] or 0),
        "failover": failover,
        "traffic_gb": float(row[5]) if row[5] is not None else None,
        "product": product,
        "nodes": nodes,
        "pool_nodes": pool_nodes,
    }
