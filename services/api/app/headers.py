from datetime import datetime, timezone
from urllib.parse import quote

from app.config import BACKUP_DASHBOARD_URL

# Karing treats a missing total, and total=0, as an empty quota and skips the node test.
UNLIMITED_QUOTA_BYTES = 10 * 1024 * 1024 * 1024 * 1024


def karing_headers(
    *,
    expire_at: datetime | None,
    used_gb: float,
    limit_gb: float | None,
    filename: str = "AcrossFlare.txt",
) -> dict[str, str]:
    expire = 0
    if expire_at:
        aware = expire_at if expire_at.tzinfo else expire_at.replace(tzinfo=timezone.utc)
        expire = int(aware.timestamp())

    download = int(used_gb * 1024 * 1024 * 1024)
    if limit_gb is None:
        total = UNLIMITED_QUOTA_BYTES if download < UNLIMITED_QUOTA_BYTES else download + UNLIMITED_QUOTA_BYTES
    else:
        total = int(limit_gb * 1024 * 1024 * 1024)
    title = quote(filename)
    # HTTP headers must stay latin-1; the Korean notice lives in YAML comments too.
    announce = BACKUP_DASHBOARD_URL
    userinfo = f"upload=0; download={download}; total={total}; expire={expire}"
    return {
        "Cache-Control": "private, no-store",
        "profile-title": "AcrossFlare",
        "profile-update-interval": "24",
        "profile-web-page-url": BACKUP_DASHBOARD_URL,
        "support-url": BACKUP_DASHBOARD_URL,
        "announce": announce,
        "announce-url": BACKUP_DASHBOARD_URL,
        "subscription-userinfo": userinfo,
        "content-disposition": f'attachment; filename="{title}"',
    }
