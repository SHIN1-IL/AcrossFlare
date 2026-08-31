import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse, Response

from app.config import TRAFFIC_SYNC_INTERVAL, traffic_sync_enabled
from app.db import fetch_subscription_by_token
from app.subscription import resolve_subscription
from app.traffic_sync import run_traffic_sync

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    scheduler: BackgroundScheduler | None = None
    if traffic_sync_enabled():
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            run_traffic_sync,
            "interval",
            seconds=TRAFFIC_SYNC_INTERVAL,
            max_instances=1,
            id="traffic_sync",
        )
        scheduler.start()
        logger.info("traffic_sync_scheduler_started interval=%ss", TRAFFIC_SYNC_INTERVAL)
    yield
    if scheduler:
        scheduler.shutdown()


app = FastAPI(title="AcrossFlare subscription", docs_url=None, redoc_url=None, lifespan=lifespan)


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

    row = fetch_subscription_by_token(resolved)
    if not row:
        raise HTTPException(status_code=404, detail="not_found")

    try:
        body, headers = resolve_subscription(row)
    except ValueError as exc:
        if str(exc) == "not_found":
            raise HTTPException(status_code=404, detail="not_found") from exc
        raise

    headers = {**headers, "Content-Type": "text/yaml; charset=utf-8"}
    if request.method == "HEAD":
        return Response(status_code=200, headers=headers)

    return PlainTextResponse(content=body, headers=headers, media_type="text/yaml; charset=utf-8")
