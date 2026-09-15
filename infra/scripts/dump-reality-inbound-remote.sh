#!/usr/bin/env bash
set -euo pipefail
PG_CONTAINER="${PG_CONTAINER:-acrossflare-postgres}"
PG_USER="${POSTGRES_USER:-acrossflare}"
PG_DB="${POSTGRES_DB:-acrossflare}"

PAYLOAD=$(docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -tA <<'SQL'
SELECT json_agg(json_build_object(
  'id', n.id,
  'name', n.name,
  'host', n.host,
  'port', n.port,
  'username', n.username,
  'password', n.password,
  'inboundId', n."inboundId"
))
FROM "Node" n
WHERE n.ddns IN ('node-tokyo.acrossflare.com', 'node-la-a.acrossflare.com');
SQL
)

printf '%s' "$PAYLOAD" | docker exec -i -w /app -e PYTHONPATH=/app acrossflare-api-1 python -c '
import json, sys
from copy import deepcopy
from app.xui_client import XuiPanelTarget, login, panel_request

def as_obj(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {}
    return value if isinstance(value, dict) else {}

def redact(obj):
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k.lower() in ("privatekey", "password", "mldsa65seed"):
                out[k] = "<redacted>"
            else:
                out[k] = redact(v)
        return out
    if isinstance(obj, list):
        return [redact(x) for x in obj]
    return obj

nodes = json.load(sys.stdin) or []
for row in nodes:
    target = XuiPanelTarget(id=row["id"], host=row["host"], port=int(row["port"]), username=row["username"], password=row["password"])
    session = login(target)
    listed = panel_request(session, "/panel/api/inbounds/list") or {}
    want = row.get("inboundId")
    for inbound in listed.get("obj") or []:
        if inbound.get("id") != want and str(inbound.get("remark")) not in ("JP_Tokyo", "US_LA"):
            continue
        stream = as_obj(inbound.get("streamSettings"))
        print("====", row["id"], inbound.get("remark"), "listen", inbound.get("listen"), "port", inbound.get("port"))
        print("stream.security", stream.get("security"), "network", stream.get("network"))
        print(json.dumps(redact(stream), indent=2)[:4000])
'
