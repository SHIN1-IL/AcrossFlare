#!/usr/bin/env bash
# Disable sniffing on Tokyo + LA(A) REALITY inbounds. Does not change dest/keys.
set -euo pipefail
PG_CONTAINER="${PG_CONTAINER:-acrossflare-postgres}"
PG_USER="${POSTGRES_USER:-acrossflare}"
PG_DB="${POSTGRES_DB:-acrossflare}"
API="${API_CONTAINER:-acrossflare-api-1}"

docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -tA <<'SQL' > /tmp/af-nodes.json
SELECT json_agg(json_build_object(
  'id', n.id, 'ddns', n.ddns, 'host', n.host, 'port', n.port,
  'username', n.username, 'password', n.password, 'inboundId', n."inboundId"
))
FROM "Node" n
WHERE n.ddns IN ('node-tokyo.acrossflare.com', 'node-la-a.acrossflare.com');
SQL

docker cp /tmp/af-nodes.json "$API:/tmp/af-nodes.json"

cat > /tmp/af-disable-sniff.py <<'PY'
import json
from copy import deepcopy
from app.xui_client import XuiPanelTarget, login, panel_request

def as_obj(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {}
    return value if isinstance(value, dict) else {}

nodes = json.load(open("/tmp/af-nodes.json")) or []
off = {"enabled": False, "destOverride": [], "metadataOnly": False, "routeOnly": False}

for row in nodes:
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
    matched = False
    for inbound in listed.get("obj") or []:
        if inbound.get("id") != want and str(inbound.get("remark")) not in ("JP_Tokyo", "US_LA"):
            continue
        if inbound.get("protocol") != "vless":
            continue
        matched = True
        before = as_obj(inbound.get("sniffing"))
        updated = deepcopy(inbound)
        if isinstance(inbound.get("streamSettings"), dict):
            updated["streamSettings"] = json.dumps(inbound["streamSettings"], separators=(",", ":"))
        if isinstance(inbound.get("settings"), dict):
            updated["settings"] = json.dumps(inbound["settings"], separators=(",", ":"))
        updated["sniffing"] = json.dumps(off, separators=(",", ":"))
        panel_request(session, f"/panel/api/inbounds/update/{inbound['id']}", method="POST", json_body=updated)
        listed2 = panel_request(session, "/panel/api/inbounds/list") or {}
        after = {}
        for item in listed2.get("obj") or []:
            if item.get("id") == inbound.get("id"):
                after = as_obj(item.get("sniffing"))
                break
        print("updated", row["ddns"], inbound.get("remark"), "before", before, "after", after)
    if not matched:
        print("NO_INBOUND", row["ddns"])
print("done")
PY

docker cp /tmp/af-disable-sniff.py "$API:/tmp/af-disable-sniff.py"
docker exec -w /app -e PYTHONPATH=/app "$API" python /tmp/af-disable-sniff.py
