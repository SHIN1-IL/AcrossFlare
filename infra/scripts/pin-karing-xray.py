"""Pin Tokyo and LA 3x-ui to Xray v26.7.28 and keep REALITY usable by Karing.

Run inside the origin API container:

    docker cp infra/scripts/pin-karing-xray.py acrossflare-api-1:/tmp/pin-karing-xray.py
    docker exec -w /app acrossflare-api-1 python /tmp/pin-karing-xray.py
"""

from __future__ import annotations

import json
import os
import re
import sys

import httpx
import psycopg

KARING_XRAY_TAG = "v26.7.28"
MIN_CLIENT = "1.0.0"
REALITY_DEST_HOST = "dl.google.com"
TARGETS = ("node-tokyo.acrossflare.com", "node-la-a.acrossflare.com")


def needs_pin(version: str) -> bool:
    match = re.match(r"v?(\d+)\.(\d+)\.(\d+)", (version or "").strip())
    if not match:
        return False
    return tuple(int(part) for part in match.groups()) >= (26, 9, 8)


def tls_mismatch(error: Exception) -> bool:
    text = str(error).lower()
    return (
        "tlsv1 alert protocol version" in text
        or "wrong version number" in text
        or "packet length too long" in text
    )


def bases(host: str, port: int) -> list[str]:
    host = host.rstrip("/")
    if host.startswith("http://") or host.startswith("https://"):
        primary = host
    else:
        scheme = "https" if port in (443, 2053) else "http"
        primary = f"{scheme}://{host}:{port}"
    if primary.startswith("https://"):
        return [primary, "http://" + primary.removeprefix("https://")]
    return [primary]


def cookie_header(response: httpx.Response) -> str:
    cookies = response.headers.get_list("set-cookie")
    return "; ".join(value.split(";", 1)[0].strip() for value in cookies if value)


def merge_cookies(*parts: str) -> str:
    jar: dict[str, str] = {}
    for part in parts:
        for pair in part.split(";"):
            trimmed = pair.strip()
            if "=" not in trimmed:
                continue
            key, value = trimmed.split("=", 1)
            jar[key] = value
    return "; ".join(f"{key}={value}" for key, value in jar.items())


def csrf_from_html(html: str) -> str:
    match = re.search(r'name="csrf-token"\s+content="([^"]+)"', html)
    return match.group(1) if match else ""


class Panel:
    def __init__(self, base: str, cookie: str, csrf: str) -> None:
        self.base = base
        self.cookie = cookie
        self.csrf = csrf

    def request(self, path: str, method: str = "GET", body: dict | None = None, timeout: float = 20) -> dict:
        headers = {"Accept": "application/json"}
        if body is not None:
            headers["Content-Type"] = "application/json"
        if self.cookie:
            headers["Cookie"] = self.cookie
        if self.csrf:
            headers["X-CSRF-Token"] = self.csrf
        with httpx.Client(timeout=timeout, verify=False, follow_redirects=False) as client:
            response = client.request(method, f"{self.base}{path}", headers=headers, json=body)
        payload = response.json() if response.content else {}
        if not response.is_success or (isinstance(payload, dict) and payload.get("success") is False):
            message = payload.get("msg") if isinstance(payload, dict) else response.status_code
            raise RuntimeError(f"{path}: {message}")
        return payload if isinstance(payload, dict) else {}


def login(host: str, port: int, username: str, password: str) -> Panel:
    last: Exception | None = None
    for base in bases(host, port):
        try:
            with httpx.Client(timeout=15, verify=False, follow_redirects=False) as client:
                opened = client.get(f"{base}/")
                opened.raise_for_status()
                csrf = csrf_from_html(opened.text)
                cookie = cookie_header(opened)
                response = client.post(
                    f"{base}/login",
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Cookie": cookie,
                        **({"X-CSRF-Token": csrf} if csrf else {}),
                    },
                    json={"username": username, "password": password},
                )
                cookie = merge_cookies(cookie, cookie_header(response))
                body = response.json() if response.content else {}
            if isinstance(body, dict) and body.get("success") is False:
                raise RuntimeError(body.get("msg") or "login_failed")
            if not cookie and not (isinstance(body, dict) and body.get("success")):
                raise RuntimeError("login_failed")
            return Panel(base, cookie, csrf)
        except Exception as error:
            last = error
            if not tls_mismatch(error):
                raise
    raise last or RuntimeError("login_failed")


def version_of(status: dict) -> str:
    obj = status.get("obj")
    if not isinstance(obj, dict):
        return ""
    xray = obj.get("xray")
    if isinstance(xray, dict) and isinstance(xray.get("version"), str):
        return xray["version"]
    version = obj.get("xrayVersion")
    return version if isinstance(version, str) else ""


def as_obj(value):
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return value if isinstance(value, dict) else {}


def align_inbound(panel: Panel, inbound_id: int, short_id: str, sni: str) -> dict:
    listed = panel.request("/panel/api/inbounds/list")
    inbound = next(
        (
            row
            for row in listed.get("obj") or []
            if isinstance(row, dict) and row.get("id") == inbound_id
        ),
        None,
    )
    if not isinstance(inbound, dict):
        raise RuntimeError(f"inbound_missing:{inbound_id}")
    stream = as_obj(inbound.get("streamSettings"))
    reality = as_obj(stream.get("realitySettings"))
    if not (reality.get("privateKey") or "").strip():
        raise RuntimeError("private_key_missing")
    before = {
        "version_field": reality.get("minClientVer") or "",
        "dest": reality.get("dest") or reality.get("target") or "",
        "serverNames": reality.get("serverNames"),
        "shortIds": reality.get("shortIds"),
    }
    reality["minClientVer"] = MIN_CLIENT
    reality["minClient"] = MIN_CLIENT
    reality["serverNames"] = [sni]
    reality["dest"] = f"{sni}:443"
    reality["target"] = f"{sni}:443"
    settings = as_obj(reality.get("settings"))
    settings["serverName"] = sni
    reality["settings"] = settings
    shorts = reality.get("shortIds")
    if isinstance(shorts, str):
        shorts = [part.strip() for part in shorts.split(",") if part.strip()]
    if not isinstance(shorts, list):
        shorts = []
    shorts = [str(item) for item in shorts]
    if short_id and short_id not in shorts:
        shorts.append(short_id)
    reality["shortIds"] = shorts
    stream["realitySettings"] = reality
    sniff = as_obj(inbound.get("sniffing"))
    sniff["enabled"] = False
    sniff["destOverride"] = []
    updated = dict(inbound)
    updated["streamSettings"] = json.dumps(stream, separators=(",", ":"))
    updated["sniffing"] = json.dumps(sniff, separators=(",", ":"))
    if isinstance(inbound.get("settings"), dict):
        updated["settings"] = json.dumps(inbound["settings"], separators=(",", ":"))
    panel.request(f"/panel/api/inbounds/update/{inbound_id}", "POST", updated, timeout=30)
    public = str(as_obj(reality.get("settings")).get("publicKey") or "")
    return {
        "before": before,
        "public_tail": public[-6:],
        "dest": reality.get("dest"),
        "names": reality.get("serverNames"),
    }


def main() -> int:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        print("database_unconfigured", file=sys.stderr)
        return 1
    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ddns, host, port, username, password, "inboundId",
                       "realityShortId", "realityServerName"
                FROM "Node"
                WHERE ddns = ANY(%s)
                """,
                (list(TARGETS),),
            )
            rows = cur.fetchall()
    if not rows:
        print("nodes_missing")
        return 1
    for ddns, host, port, username, password, inbound_id, short_id, sni in rows:
        label = ddns.split(".")[0]
        try:
            panel = login(str(host), int(port or 2053), str(username), str(password))
            status = panel.request("/panel/api/server/status")
            current = version_of(status)
            pinned = current
            if "--status" in sys.argv:
                xray = (status.get("obj") or {}).get("xray") if isinstance(status.get("obj"), dict) else {}
                state = xray.get("state") if isinstance(xray, dict) else ""
                print(json.dumps({"node": label, "xray": current, "state": state, "pin": needs_pin(current)}))
                continue
            if needs_pin(current):
                installed = panel.request(
                    f"/panel/api/server/installXray/{KARING_XRAY_TAG}",
                    "POST",
                    {},
                    timeout=180,
                )
                print(json.dumps({"node": label, "install_msg": str(installed.get("msg") or "")[:180]}))
                import time

                time.sleep(5)
                pinned = version_of(panel.request("/panel/api/server/status")) or KARING_XRAY_TAG
            aligned = align_inbound(panel, int(inbound_id or 1), str(short_id or ""), str(sni or REALITY_DEST_HOST))
            print(
                json.dumps(
                    {
                        "node": label,
                        "xray_before": current,
                        "xray_after": pinned,
                        "minClient_before": aligned["before"]["version_field"],
                        "dest_before": aligned["before"]["dest"],
                        "dest_after": aligned["dest"],
                        "serverNames": aligned["names"],
                    },
                    ensure_ascii=False,
                )
            )
        except Exception as error:
            print(json.dumps({"node": label, "error": type(error).__name__, "detail": str(error)[:240]}))
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
