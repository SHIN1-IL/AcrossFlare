from base64 import b64encode
from urllib.parse import quote, urlencode

from app.config import BACKUP_ANNOUNCE, BACKUP_DASHBOARD_URL, DEFAULT_VLESS_PORT, KARING_REFRESH_ANNOUNCE, VLESS_CLIENT_FLOW
from app.nodes import NodeRow, has_reality_config, vless_connect_host


def with_backup_notice(yaml_body: str, *, refresh_hint: bool = False) -> str:
    if "#profile-web-page-url:" in yaml_body:
        body = yaml_body if yaml_body.endswith("\n") else f"{yaml_body}\n"
        if refresh_hint and KARING_REFRESH_ANNOUNCE not in body:
            return f"#announce: {KARING_REFRESH_ANNOUNCE}\n{body}"
        return body

    announce = f"{BACKUP_ANNOUNCE} {BACKUP_DASHBOARD_URL}"
    notice_lines = [
        f"#profile-web-page-url: {BACKUP_DASHBOARD_URL}",
        f"#support-url: {BACKUP_DASHBOARD_URL}",
        f"#announce: {announce}",
        f"# {BACKUP_ANNOUNCE}: {BACKUP_DASHBOARD_URL}",
    ]
    if refresh_hint:
        notice_lines.append(f"#announce: {KARING_REFRESH_ANNOUNCE}")
    notice = "\n".join(notice_lines)
    return f"{notice}\n{yaml_body.lstrip()}"


def _proxy_name(node: NodeRow, index: int) -> str:
    ddns = node.get("ddns") or f"node-{index}"
    return ddns.split(".")[0] or f"node-{index}"


def _build_reality_proxy(node: NodeRow, uuid: str, index: int) -> str:
    port = int(node.get("vlessPort") or DEFAULT_VLESS_PORT)
    lines = [
        f"  - name: {_proxy_name(node, index)}",
        "    type: vless",
        f"    server: {vless_connect_host(node)}",
        f"    port: {port}",
        f"    uuid: {uuid}",
        "    network: tcp",
        "    tls: true",
        "    udp: true",
        f"    flow: {VLESS_CLIENT_FLOW}",
        f"    servername: {node.get('realityServerName')}",
        "    reality-opts:",
        f"      public-key: {node.get('realityPublicKey')}",
    ]
    short_id = (node.get("realityShortId") or "").strip()
    if short_id:
        lines.append(f"      short-id: {short_id}")
    fingerprint = (node.get("realityFingerprint") or "").strip() or "chrome"
    lines.append(f"    client-fingerprint: {fingerprint}")
    return "\n".join(lines)


def _proxy_remark(node: NodeRow, index: int) -> str:
    return _proxy_name(node, index)


def _build_reality_uri(node: NodeRow, uuid: str, index: int) -> str:
    port = int(node.get("vlessPort") or DEFAULT_VLESS_PORT)
    query = urlencode(
        {
            "encryption": "none",
            "flow": VLESS_CLIENT_FLOW,
            "fp": (node.get("realityFingerprint") or "").strip() or "chrome",
            "pbk": (node.get("realityPublicKey") or "").strip(),
            "security": "reality",
            "sid": (node.get("realityShortId") or "").strip(),
            "sni": (node.get("realityServerName") or "").strip(),
            "type": "tcp",
        }
    )
    host = vless_connect_host(node)
    name = quote(_proxy_remark(node, index))
    return f"vless://{uuid}@{host}:{port}?{query}#{name}"


def build_vless_uri_list(nodes: list[NodeRow], uuid: str) -> str:
    links = [
        _build_reality_uri(node, uuid, index)
        for index, node in enumerate(nodes)
        if has_reality_config(node)
    ]
    return "\n".join(links) + ("\n" if links else "")


def build_vless_sub_base64(nodes: list[NodeRow], uuid: str) -> str:
    text = build_vless_uri_list(nodes, uuid)
    if not text:
        return ""
    return b64encode(text.encode("utf-8")).decode("ascii")


def _build_ws_proxy(node: NodeRow, uuid: str, index: int) -> str:
    port = int(node.get("vlessPort") or DEFAULT_VLESS_PORT)
    return "\n".join(
        [
            f"  - name: {_proxy_name(node, index)}",
            "    type: vless",
            f"    server: {vless_connect_host(node)}",
            f"    port: {port}",
            f"    uuid: {uuid}",
            "    network: ws",
            "    tls: true",
            "    udp: true",
            "    ws-opts:",
            "      path: /vless",
        ]
    )


def _build_proxy_block(node: NodeRow, uuid: str, index: int) -> str:
    return _build_reality_proxy(node, uuid, index) if has_reality_config(node) else _build_ws_proxy(node, uuid, index)


def build_vless_yaml(nodes: list[NodeRow], uuid: str) -> str:
    proxies = [_build_proxy_block(node, uuid, index) for index, node in enumerate(nodes)]
    body = "# AcrossFlare subscription\n# Content-Type: text/yaml\nproxies:\n"
    if proxies:
        body += "\n".join(proxies) + "\n"
    return with_backup_notice(body)


def build_vless_yaml_with_hint(nodes: list[NodeRow], uuid: str, *, refresh_hint: bool = False) -> str:
    yaml_body = build_vless_yaml(nodes, uuid)
    if not refresh_hint:
        return yaml_body
    return with_backup_notice(yaml_body, refresh_hint=True)


def empty_proxies_yaml(*, refresh_hint: bool = False) -> str:
    return with_backup_notice(
        "# AcrossFlare subscription\n# Content-Type: text/yaml\nproxies: []\n",
        refresh_hint=refresh_hint,
    )
