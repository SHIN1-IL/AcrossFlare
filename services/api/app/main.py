import os
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import psycopg
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse, Response

BACKUP_DASHBOARD_URL = os.environ.get(
    "BACKUP_DASHBOARD_URL", "https://acrossflare.com/dashboard"
).rstrip("/")
BACKUP_ANNOUNCE = "보안 백업 공간 바로가기"
DATABASE_URL = os.environ.get("DATABASE_URL", "")

app = FastAPI(title="AcrossFlare subscription", docs_url=None, redoc_url=None)


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "true"}


@app.api_route("/api/v1/subscription", methods=["GET", "HEAD"])
@app.api_route("/api/v1/subscription/{token}", methods=["GET", "HEAD"])
def subscription(
    request: Request,
    token: str | None = None,
    q: str | None = Query(default=None, alias="token"),
) -> Response:
    resolved = token or q
    if not resolved:
        raise HTTPException(status_code=404, detail="not_found")

    row = fetch_credential(resolved)
    if not row or row["status"] != "ACTIVE" or not row["yaml_body"]:
        raise HTTPException(status_code=404, detail="not_found")

    headers = karing_headers(
        expire_at=row["expires_at"],
        used_gb=row["traffic_used_gb"],
        limit_gb=row["traffic_gb"],
    )
    if request.method == "HEAD":
        return Response(status_code=200, headers=headers)
    body = with_backup_notice(row["yaml_body"])
    return PlainTextResponse(content=body, headers=headers, media_type="text/yaml; charset=utf-8")


def fetch_credential(token: str) -> dict[str, Any] | None:
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="database_unconfigured")

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  c."yamlBody",
                  s.status::text,
                  s."expiresAt",
                  s."trafficUsedGb",
                  p."trafficGb"
                FROM "Credential" c
                JOIN "Subscription" s ON s.id = c."subscriptionId"
                JOIN "Plan" p ON p.id = s."planId"
                WHERE c."yamlToken" = %s
                LIMIT 1
                """,
                (token,),
            )
            row = cur.fetchone()

    if not row:
        return None

    return {
        "yaml_body": row[0],
        "status": row[1],
        "expires_at": row[2],
        "traffic_used_gb": float(row[3] or 0),
        "traffic_gb": float(row[4]) if row[4] is not None else None,
    }


def with_backup_notice(yaml_body: str) -> str:
    if "#profile-web-page-url:" in yaml_body:
        return yaml_body if yaml_body.endswith("\n") else f"{yaml_body}\n"
    announce = f"{BACKUP_ANNOUNCE} {BACKUP_DASHBOARD_URL}"
    notice = "\n".join(
        [
            f"#profile-web-page-url: {BACKUP_DASHBOARD_URL}",
            f"#support-url: {BACKUP_DASHBOARD_URL}",
            f"#announce: {announce}",
            f"# {BACKUP_ANNOUNCE}: {BACKUP_DASHBOARD_URL}",
        ]
    )
    return f"{notice}\n{yaml_body.lstrip()}"


def karing_headers(*, expire_at: datetime | None, used_gb: float, limit_gb: float | None) -> dict[str, str]:
    expire = 0
    if expire_at:
        aware = expire_at if expire_at.tzinfo else expire_at.replace(tzinfo=timezone.utc)
        expire = int(aware.timestamp())

    download = int(used_gb * 1024 * 1024 * 1024)
    total = 0 if limit_gb is None else int(limit_gb * 1024 * 1024 * 1024)
    title = quote("AcrossFlare")
    announce = f"{BACKUP_ANNOUNCE} {BACKUP_DASHBOARD_URL}"
    return {
        "Cache-Control": "private, no-store",
        "profile-title": "AcrossFlare",
        "profile-update-interval": "24",
        "profile-web-page-url": BACKUP_DASHBOARD_URL,
        "support-url": BACKUP_DASHBOARD_URL,
        "announce": announce,
        "announce-url": BACKUP_DASHBOARD_URL,
        "subscription-userinfo": f"upload=0; download={download}; total={total}; expire={expire}",
        "content-disposition": f'attachment; filename="{title}.yaml"',
    }
