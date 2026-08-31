import os

BACKUP_DASHBOARD_URL = os.environ.get(
    "BACKUP_DASHBOARD_URL", "https://acrossflare.com/dashboard"
).rstrip("/")
BACKUP_ANNOUNCE = "보안 백업 공간 바로가기"
KARING_REFRESH_ANNOUNCE = (
    "트래픽 초과·노드 전환 후 Karing [서브스크립션 수동 업데이트]를 눌러 주세요."
)
VLESS_CLIENT_FLOW = "xtls-rprx-vision"
DEFAULT_VLESS_PORT = 443
DATABASE_URL = os.environ.get("DATABASE_URL", "")

XUI_API_TOKEN = os.environ.get("XUI_API_TOKEN", "")
XUI_TLS_INSECURE = os.environ.get("XUI_TLS_INSECURE", "") == "1"
TRAFFIC_SYNC_ENABLED = os.environ.get("TRAFFIC_SYNC_ENABLED", "1") != "0"
TRAFFIC_SYNC_INTERVAL = max(60, int(os.environ.get("TRAFFIC_SYNC_INTERVAL", "300")))


def traffic_sync_enabled() -> bool:
    if os.environ.get("TRAFFIC_SYNC_ENABLED", "1") == "0":
        return False
    if os.environ.get("PROVISION_MODE") == "simulate":
        return False
    return bool(os.environ.get("DATABASE_URL", ""))


def provision_live() -> bool:
    return os.environ.get("PROVISION_MODE", "live") != "simulate"
