#!/usr/bin/env bash
# Read-only: 3x-ui inbound vs Node DB vs generated YAML/URI. No inbound updates.
set -euo pipefail
PG_CONTAINER="${PG_CONTAINER:-acrossflare-postgres}"
PG_USER="${POSTGRES_USER:-acrossflare}"
PG_DB="${POSTGRES_DB:-acrossflare}"
API="${API_CONTAINER:-acrossflare-api-1}"

docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -tA <<'SQL' > /tmp/af-cmp-nodes.json
SELECT json_agg(json_build_object(
  'id', n.id,
  'name', n.name,
  'ddns', n.ddns,
  'role', n.role,
  'host', n.host,
  'port', n.port,
  'username', n.username,
  'password', n.password,
  'inboundId', n."inboundId",
  'vlessPort', n."vlessPort",
  'realityPublicKey', n."realityPublicKey",
  'realityShortId', n."realityShortId",
  'realityServerName', n."realityServerName",
  'realityFingerprint', n."realityFingerprint"
))
FROM "Node" n
WHERE n.ddns IN ('node-tokyo.acrossflare.com', 'node-la-a.acrossflare.com');
SQL

docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -tA <<'SQL' > /tmp/af-cmp-sub.json
SELECT COALESCE(json_build_object(
  'uuid', s.uuid,
  'status', s.status
), '{}'::json)
FROM "Subscription" s
WHERE s.status = 'ACTIVE' AND s.uuid IS NOT NULL
ORDER BY s."updatedAt" DESC
LIMIT 1;
SQL

docker cp /tmp/af-cmp-nodes.json "$API:/tmp/af-cmp-nodes.json"
docker cp /tmp/af-cmp-sub.json "$API:/tmp/af-cmp-sub.json"

cat > /tmp/af-cmp-reality.py <<'PY'
import hashlib
import json
import re
from urllib.parse import parse_qs, urlparse

from app.nodes import node_row_from_db, vless_connect_host
from app.xui_client import XuiPanelTarget, login, panel_request
from app.yaml_builder import _build_reality_proxy, _build_reality_uri

def as_obj(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {}
    return value if isinstance(value, dict) else {}

def fp(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return "empty"
    return hashlib.sha256(raw.encode()).hexdigest()[:12]

def b64_variants(value: str) -> set[str]:
    raw = (value or "").strip()
    if not raw:
        return {""}
    variants = {raw}
    trans = raw.replace("-", "+").replace("_", "/")
    variants.add(trans)
    variants.add(raw.replace("+", "-").replace("/", "_"))
    for item in list(variants):
        pad = item + ("=" * ((4 - len(item) % 4) % 4))
        variants.add(pad)
        variants.add(item.rstrip("="))
    return variants

def mark(ok: bool) -> str:
    return "OK" if ok else "MISMATCH"

nodes = json.load(open("/tmp/af-cmp-nodes.json")) or []
try:
    sub = json.load(open("/tmp/af-cmp-sub.json")) or {}
except json.JSONDecodeError:
    sub = {}
uuid = (sub.get("uuid") or "00000000-0000-0000-0000-000000000000").strip()

print("=== COMPARE 3x-ui vs DB vs generated ===")
print("sample_uuid_fp", fp(uuid))
print()

for row in nodes:
    print("########", row["ddns"], row["name"], "id", row["id"], "role", row["role"])
    session = login(
        XuiPanelTarget(
            id=row["id"],
            host=row["host"],
            port=int(row["port"]),
            username=row["username"],
            password=row["password"],
        )
    )
    listed = panel_request(session, "/panel/api/inbounds/list") or {}
    want = row.get("inboundId")
    inbound = None
    for item in listed.get("obj") or []:
        if item.get("id") == want or str(item.get("remark")) in ("JP_Tokyo", "US_LA"):
            inbound = item
            break
    if not inbound:
        print("NO_INBOUND inboundId", want)
        print()
        continue

    stream = as_obj(inbound.get("streamSettings"))
    reality = as_obj(stream.get("realitySettings"))
    settings = as_obj(reality.get("settings"))
    sniff = as_obj(inbound.get("sniffing"))
    inbound_settings = as_obj(inbound.get("settings"))
    clients = inbound_settings.get("clients") or []
    flows = sorted({str(c.get("flow") or "") for c in clients if isinstance(c, dict)})
    emails_n = len(clients) if isinstance(clients, list) else 0
    uuid_on_inbound = any(
        isinstance(c, dict) and str(c.get("id") or "").lower() == uuid.lower() for c in clients
    ) if uuid and uuid.count("-") == 4 else False

    short_ids = reality.get("shortIds") or []
    if isinstance(short_ids, str):
        short_ids = [short_ids]
    short_ids = [str(x).strip() for x in short_ids]
    panel_pbk = (settings.get("publicKey") or "").strip()
    panel_dest = str(reality.get("dest") or "")
    panel_target = str(reality.get("target") or "")
    panel_spider = str(reality.get("spiderX") or "")
    panel_names = reality.get("serverNames") or []
    if isinstance(panel_names, str):
        panel_names = [panel_names]
    panel_fp = (settings.get("fingerprint") or "").strip()
    panel_sni_setting = (settings.get("serverName") or "").strip()

    db_pbk = (row.get("realityPublicKey") or "").strip()
    db_sid = (row.get("realityShortId") or "").strip()
    db_sni = (row.get("realityServerName") or "").strip()
    db_fp = (row.get("realityFingerprint") or "").strip() or "chrome"
    db_port = int(row.get("vlessPort") or 443)
    gen_host = vless_connect_host(node_row_from_db(row))
    yaml_block = _build_reality_proxy(node_row_from_db(row), uuid, 0)
    uri = _build_reality_uri(node_row_from_db(row), uuid, 0)
    parsed = urlparse(uri)
    q = {k: v[0] for k, v in parse_qs(parsed.query).items()}

    yaml_server = re.search(r"server: (\S+)", yaml_block)
    yaml_port = re.search(r"port: (\S+)", yaml_block)
    yaml_sni = re.search(r"servername: (\S+)", yaml_block)
    yaml_pbk = re.search(r"public-key: (\S+)", yaml_block)
    yaml_sid = re.search(r"short-id: (\S+)", yaml_block)
    yaml_fp = re.search(r"client-fingerprint: (\S+)", yaml_block)
    yaml_flow = re.search(r"flow: (\S+)", yaml_block)

    inbound_port = inbound.get("port")
    dest_host = panel_dest.split(":")[0] if panel_dest else ""
    names_ok = db_sni in panel_names if db_sni else False
    dest_ok = dest_host == db_sni or panel_dest == f"{db_sni}:443"
    sid_ok = db_sid in short_ids
    pbk_ok = bool(b64_variants(panel_pbk) & b64_variants(db_pbk))
    uri_sni_ok = q.get("sni") == db_sni
    uri_sid_ok = q.get("sid") == db_sid
    uri_pbk_ok = bool(b64_variants(q.get("pbk") or "") & b64_variants(panel_pbk))
    yaml_sni_ok = (yaml_sni.group(1) if yaml_sni else "") == db_sni
    yaml_sid_ok = (yaml_sid.group(1) if yaml_sid else "") == db_sid
    yaml_pbk_ok = bool(b64_variants(yaml_pbk.group(1) if yaml_pbk else "") & b64_variants(panel_pbk))
    port_ok = int(inbound_port) == db_port == int(q.get("port") or parsed.port or 0)
    host_from_panel = None
    m = re.search(r"(?:https?://)?(\d{1,3}(?:\.\d{1,3}){3})", row.get("host") or "")
    if m:
        host_from_panel = m.group(1)

    print("3x-ui")
    print("  remark", inbound.get("remark"), "inboundId", inbound.get("id"), "want", want, "id_match", inbound.get("id") == want)
    print("  listen", inbound.get("listen") or "0.0.0.0", "port", inbound_port, "protocol", inbound.get("protocol"))
    print("  stream.security", stream.get("security"), "network", stream.get("network"))
    print("  dest", panel_dest, "target", panel_target, "spiderX", panel_spider or "empty")
    print("  serverNames", panel_names)
    print("  settings.serverName", panel_sni_setting or "empty", "fingerprint", panel_fp or "empty")
    print("  shortIds", short_ids)
    print("  publicKey_fp", fp(panel_pbk), "len", len(panel_pbk), "has_urlsafe", ("-" in panel_pbk or "_" in panel_pbk))
    print("  clients", emails_n, "flows", flows, "sample_uuid_on_inbound", uuid_on_inbound)
    print("  sniffing", sniff.get("enabled"), "destOverride", sniff.get("destOverride"))
    print("DB/admin")
    print("  host", row.get("host"), "panelPort", row.get("port"), "inboundId", want, "vlessPort", db_port)
    print("  connect_host", gen_host, "panel_ip", host_from_panel)
    print("  sni", db_sni, "sid", db_sid, "fp", db_fp)
    print("  publicKey_fp", fp(db_pbk), "len", len(db_pbk), "has_urlsafe", ("-" in db_pbk or "_" in db_pbk))
    print("generated URI")
    print("  host", parsed.hostname, "port", parsed.port, "sni", q.get("sni"), "sid", q.get("sid"), "fp", q.get("fp"), "flow", q.get("flow"), "security", q.get("security"), "type", q.get("type"))
    print("  pbk_fp", fp(q.get("pbk") or ""), "pbk_urlsafe", ("-" in (q.get("pbk") or "") or "_" in (q.get("pbk") or "")))
    print("generated YAML")
    print("  server", yaml_server.group(1) if yaml_server else "", "port", yaml_port.group(1) if yaml_port else "", "sni", yaml_sni.group(1) if yaml_sni else "", "sid", yaml_sid.group(1) if yaml_sid else "", "fp", yaml_fp.group(1) if yaml_fp else "", "flow", yaml_flow.group(1) if yaml_flow else "")
    print("CHECKS")
    print("  inbound_id", mark(inbound.get("id") == want))
    print("  protocol_vless", mark(inbound.get("protocol") == "vless"))
    print("  security_reality", mark(stream.get("security") == "reality"))
    print("  network_tcp", mark((stream.get("network") or "tcp") == "tcp"))
    print("  dest_host==db_sni", mark(dest_ok), "dest", panel_dest, "db", db_sni)
    print("  serverNames_contains_db_sni", mark(names_ok), panel_names, db_sni)
    print("  settings.serverName==db_sni", mark(panel_sni_setting in ("", db_sni)))
    print("  sid_in_shortIds", mark(sid_ok), "db", db_sid, "panel", short_ids)
    print("  pbk_db==panel", mark(pbk_ok), fp(db_pbk), fp(panel_pbk))
    print("  uri_sni==db", mark(uri_sni_ok))
    print("  uri_sid==db", mark(uri_sid_ok))
    print("  uri_pbk==panel", mark(uri_pbk_ok))
    print("  yaml_sni==db", mark(yaml_sni_ok))
    print("  yaml_sid==db", mark(yaml_sid_ok))
    print("  yaml_pbk==panel", mark(yaml_pbk_ok))
    print("  ports_inbound_db_uri", mark(int(inbound_port) == db_port == parsed.port))
    print("  connect_host==panel_ip", mark(gen_host == host_from_panel), gen_host, host_from_panel)
    print("  vision_flow_clients", mark("xtls-rprx-vision" in flows or flows == [""] or not flows), flows)
    print("  uri_flow", mark(q.get("flow") == "xtls-rprx-vision"))
    print()
print("done")
PY

docker cp /tmp/af-cmp-reality.py "$API:/tmp/af-cmp-reality.py"
docker exec -w /app -e PYTHONPATH=/app "$API" python /tmp/af-cmp-reality.py
echo done
