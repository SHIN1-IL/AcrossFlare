import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from urllib.parse import quote

import httpx

from app.config import VLESS_CLIENT_FLOW, XUI_API_TOKEN, XUI_TLS_INSECURE

logger = logging.getLogger(__name__)


class XuiError(Exception):
    pass


@dataclass(frozen=True)
class XuiPanelTarget:
    id: str
    host: str
    port: int
    username: str
    password: str


@dataclass(frozen=True)
class XuiSession:
    base_url: str
    cookie: str
    csrf: str
    bearer: str


def panel_base(node: XuiPanelTarget) -> str:
    if node.host.startswith("http://") or node.host.startswith("https://"):
        return node.host.rstrip("/")
    scheme = "https" if node.port in (443, 2053) else "http"
    return f"{scheme}://{node.host}:{node.port}"


def _merge_cookies(*parts: str) -> str:
    jar: dict[str, str] = {}
    for part in parts:
        for pair in part.split(";"):
            trimmed = pair.strip()
            if "=" not in trimmed:
                continue
            key, value = trimmed.split("=", 1)
            jar[key] = value
    return "; ".join(f"{key}={value}" for key, value in jar.items())


def _cookie_header(response: httpx.Response) -> str:
    cookies = response.headers.get_list("set-cookie")
    if not cookies:
        single = response.headers.get("set-cookie")
        cookies = [single] if single else []
    return "; ".join(value.split(";", 1)[0].strip() for value in cookies if value)


def _csrf_from_html(html: str) -> str:
    match = re.search(r'name="csrf-token"\s+content="([^"]+)"', html)
    return match.group(1) if match else ""


def _http_client() -> httpx.Client:
    return httpx.Client(timeout=10.0, verify=not XUI_TLS_INSECURE, follow_redirects=False)


def login(node: XuiPanelTarget) -> XuiSession:
    if XUI_API_TOKEN:
        return XuiSession(base_url=panel_base(node), cookie="", csrf="", bearer=XUI_API_TOKEN)

    base_url = panel_base(node)
    with _http_client() as client:
        bootstrap = client.get(f"{base_url}/")
        bootstrap.raise_for_status()
        csrf = _csrf_from_html(bootstrap.text)
        cookie = _cookie_header(bootstrap)

        response = client.post(
            f"{base_url}/login",
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Cookie": cookie,
                **({"X-CSRF-Token": csrf} if csrf else {}),
            },
            json={"username": node.username, "password": node.password},
        )
        cookie = _merge_cookies(cookie, _cookie_header(response))
        body = response.json() if response.content else None

        if not cookie and not (isinstance(body, dict) and body.get("success")):
            message = body.get("msg") if isinstance(body, dict) else "login_failed"
            raise XuiError(f"{message}:{node.id}")

        if isinstance(body, dict) and body.get("success") is False:
            raise XuiError(body.get("msg") or f"login_failed:{node.id}")

        return XuiSession(base_url=base_url, cookie=cookie, csrf=csrf, bearer="")


def panel_request(
    session: XuiSession,
    path: str,
    *,
    method: str = "GET",
    json_body: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    headers = {"Accept": "application/json"}
    if json_body is not None:
        headers["Content-Type"] = "application/json"
    if session.bearer:
        headers["Authorization"] = f"Bearer {session.bearer}"
    if session.cookie:
        headers["Cookie"] = session.cookie
    if session.csrf:
        headers["X-CSRF-Token"] = session.csrf

    with _http_client() as client:
        response = client.request(
            method,
            f"{session.base_url}{path}",
            headers=headers,
            json=json_body,
        )
        body = response.json() if response.content else None

    if not response.is_success or (isinstance(body, dict) and body.get("success") is False):
        message = body.get("msg") if isinstance(body, dict) else f"xui_request_failed:{path}:{response.status_code}"
        raise XuiError(message)

    return body if isinstance(body, dict) else None


def _is_missing_route(error: XuiError) -> bool:
    message = str(error).lower()
    return ":404:" in message or "not found" in message


def _is_duplicate(error: XuiError) -> bool:
    message = str(error).lower()
    return "duplicate" in message or "already" in message or "exist" in message


def _try_panel_requests(session: XuiSession, attempts: list[tuple[str, str, dict[str, Any] | None]]) -> None:
    last_error: XuiError | None = None
    for path, method, json_body in attempts:
        try:
            panel_request(session, path, method=method, json_body=json_body)
            return
        except XuiError as error:
            if _is_duplicate(error):
                return
            last_error = error
            if not _is_missing_route(error):
                raise

    if last_error:
        raise last_error
    raise XuiError("xui_request_failed")


def _inbound_id_from(listed: dict[str, Any] | None, protocol: str = "vless") -> int:
    rows = listed.get("obj") if listed else None
    if not isinstance(rows, list):
        raise XuiError(f"{protocol}_inbound_missing")

    inbound = next(
        (
            row
            for row in rows
            if isinstance(row, dict)
            and row.get("enable", True) is not False
            and protocol in str(row.get("protocol", "")).lower()
        ),
        None,
    )
    fallback = rows[0] if protocol == "vless" and rows else None
    inbound_id = (inbound or fallback or {}).get("id") if isinstance(inbound or fallback, dict) else None
    if not inbound_id:
        raise XuiError(f"{protocol}_inbound_missing")
    return int(inbound_id)


def _client_fields(
    *,
    uuid: str,
    email: str,
    expires_at: datetime,
    traffic_gb: float | None,
) -> dict[str, Any]:
    total_gb = 0 if traffic_gb is None else int(traffic_gb * 1024 * 1024 * 1024)
    return {
        "id": uuid,
        "email": email,
        "enable": True,
        "expiryTime": int(expires_at.timestamp() * 1000),
        "totalGB": total_gb,
        "limitIp": 0,
        "subId": email,
        "flow": VLESS_CLIENT_FLOW,
    }


def add_xui_client(
    session: XuiSession,
    *,
    uuid: str,
    email: str,
    expires_at: datetime,
    traffic_gb: float | None,
) -> None:
    listed = panel_request(session, "/panel/api/inbounds/list")
    inbound_id = _inbound_id_from(listed)
    client = _client_fields(uuid=uuid, email=email, expires_at=expires_at, traffic_gb=traffic_gb)

    _try_panel_requests(
        session,
        [
            (
                "/panel/api/clients/add",
                "POST",
                {"client": client, "inboundIds": [inbound_id]},
            ),
            (
                "/panel/api/inbounds/addClient",
                "POST",
                {
                    "id": inbound_id,
                    "settings": json.dumps({"clients": [client]}),
                },
            ),
        ],
    )


def parse_client_traffic(payload: Any) -> tuple[int, int]:
    if isinstance(payload, dict):
        if "obj" in payload and isinstance(payload["obj"], dict):
            payload = payload["obj"]
        up = int(payload.get("up") or payload.get("upload") or 0)
        down = int(payload.get("down") or payload.get("download") or 0)
        return up, down

    if isinstance(payload, list) and payload:
        return parse_client_traffic(payload[0])

    return 0, 0


def fetch_client_traffic(session: XuiSession, email: str) -> tuple[int, int]:
    encoded = quote(email, safe="")
    try:
        body = panel_request(session, f"/panel/api/inbounds/getClientTraffics/{encoded}")
    except XuiError:
        body = _traffic_from_inbound_list(session, email)

    if not body:
        return 0, 0

    return parse_client_traffic(body.get("obj", body) if isinstance(body, dict) else body)


def _traffic_from_inbound_list(session: XuiSession, email: str) -> dict[str, Any] | None:
    listed = panel_request(session, "/panel/api/inbounds/list")
    if not listed:
        return None

    rows = listed.get("obj")
    if not isinstance(rows, list):
        return None

    for inbound in rows:
        stats = inbound.get("clientStats") if isinstance(inbound, dict) else None
        if not isinstance(stats, list):
            continue
        for stat in stats:
            if not isinstance(stat, dict):
                continue
            if stat.get("email") == email:
                return stat

    return None
