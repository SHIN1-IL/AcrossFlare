#!/usr/bin/env bash
set -euo pipefail
PG_CONTAINER="${PG_CONTAINER:-acrossflare-postgres}"
PG_USER="${POSTGRES_USER:-acrossflare}"
PG_DB="${POSTGRES_DB:-acrossflare}"
API="${API_CONTAINER:-acrossflare-api-1}"

docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -tA <<'SQL' > /tmp/af-cmp2-nodes.json
SELECT json_agg(json_build_object(
  'id', n.id, 'ddns', n.ddns, 'host', n.host, 'port', n.port,
  'username', n.username, 'password', n.password, 'inboundId', n."inboundId"
))
FROM "Node" n
WHERE n.ddns IN ('node-tokyo.acrossflare.com', 'node-la-a.acrossflare.com');
SQL

docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -tA <<'SQL' > /tmp/af-cmp2-creds.json
SELECT json_agg(json_build_object(
  'uuid', c.uuid,
  'status', s.status,
  'yamlHasCf', (c."yamlBody" ILIKE '%cloudflare%'),
  'yamlHasMs', (c."yamlBody" ILIKE '%microsoft%'),
  'yamlLen', length(c."yamlBody")
))
FROM "Credential" c
JOIN "Subscription" s ON s.id = c."subscriptionId"
WHERE c.uuid IS NOT NULL;
SQL

docker cp /tmp/af-cmp2-nodes.json "$API:/tmp/af-cmp2-nodes.json"
docker cp /tmp/af-cmp2-creds.json "$API:/tmp/af-cmp2-creds.json"

cat > /tmp/af-cmp2.py <<'PY'
import base64, hashlib, json
from app.xui_client import XuiPanelTarget, login, panel_request

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

def key_bytes(value: str) -> int:
    raw = (value or "").strip()
    if not raw:
        return 0
    s = raw.replace("-", "+").replace("_", "/")
    s += "=" * ((4 - len(s) % 4) % 4)
    try:
        return len(base64.b64decode(s))
    except Exception:
        return -1

nodes = json.load(open("/tmp/af-cmp2-nodes.json")) or []
creds = json.load(open("/tmp/af-cmp2-creds.json")) or []
uuids = { (c.get("uuid") or "").strip().lower() for c in creds if c.get("uuid") }
print(
    "credentials",
    len(creds),
    "yamlHasCf",
    sum(1 for c in creds if c.get("yamlHasCf")),
    "yamlHasMs",
    sum(1 for c in creds if c.get("yamlHasMs")),
    "statuses",
    [c.get("status") for c in creds],
)

for row in nodes:
    session = login(XuiPanelTarget(id=row["id"], host=row["host"], port=int(row["port"]), username=row["username"], password=row["password"]))
    listed = panel_request(session, "/panel/api/inbounds/list") or {}
    want = row.get("inboundId")
    for inbound in listed.get("obj") or []:
        if inbound.get("id") != want:
            continue
        stream = as_obj(inbound.get("streamSettings"))
        reality = as_obj(stream.get("realitySettings"))
        settings = as_obj(reality.get("settings"))
        inbound_settings = as_obj(inbound.get("settings"))
        clients = inbound_settings.get("clients") or []
        pbk = settings.get("publicKey") or ""
        print("----", row["ddns"])
        print("  pbk_bytes", key_bytes(pbk), "urlsafe", "-" in pbk or "_" in pbk)
        print("  decryption", "present" if settings.get("privateKey") else "missing")
        print("  sniffing_raw", inbound.get("sniffing"))
        print("  clients")
        for c in clients:
            if not isinstance(c, dict):
                continue
            cid = str(c.get("id") or "").lower()
            print("   email", c.get("email"), "enable", c.get("enable"), "flow", c.get("flow"), "uuid_fp", fp(cid), "in_db_creds", cid in uuids)
        extra = {k: reality.get(k) for k in ("show", "xver", "minClient", "maxClient", "maxTimediff", "minClientVer", "maxClientVer") if k in reality or True}
        print("  reality_extra", {k: reality.get(k) for k in ("show","xver","minClient","maxClient","maxTimediff","minClientVer","maxClientVer")})
PY
docker cp /tmp/af-cmp2.py "$API:/tmp/af-cmp2.py"
docker exec -w /app -e PYTHONPATH=/app "$API" python /tmp/af-cmp2.py
