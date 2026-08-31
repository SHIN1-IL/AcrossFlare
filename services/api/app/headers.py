from datetime import datetime, timezone
from urllib.parse import quote

from app.config import BACKUP_DASHBOARD_URL


def karing_headers(
    *,
    expire_at: datetime | None,
    used_gb: float,
    limit_gb: float | None,
) -> dict[str, str]:
    expire = 0
    if expire_at:
        aware = expire_at if expire_at.tzinfo else expire_at.replace(tzinfo=timezone.utc)
        expire = int(aware.timestamp())

    download = int(used_gb * 1024 * 1024 * 1024)
    total = 0 if limit_gb is None else int(limit_gb * 1024 * 1024 * 1024)
    title = quote("AcrossFlare")
    # HTTP headers must stay latin-1; the Korean notice lives in YAML comments too.
    announce = BACKUP_DASHBOARD_URL
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
