#!/usr/bin/env bash
# Set REALITY minClientVer so Karing/mihomo (old reported core ver) can handshake.
# Does not rotate keys or dest.
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

cat > /tmp/af-minclient.py <<'PY'
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
    for inbound in listed.get("obj") or []:
        if inbound.get("id") != want and str(inbound.get("remark")) not in ("JP_Tokyo", "US_LA"):
            continue
        if inbound.get("protocol") != "vless":
            continue
        stream = as_obj(inbound.get("streamSettings"))
        reality = as_obj(stream.get("realitySettings"))
        settings = as_obj(reality.get("settings"))
        priv = bool((reality.get("privateKey") or "").strip())
        print(
            "before",
            row["ddns"],
            "dest",
            reality.get("dest"),
            "minClientVer",
            repr(reality.get("minClientVer")),
            "minClient",
            repr(reality.get("minClient")),
            "privateKey",
            "present" if priv else "MISSING",
        )
        if not priv:
            print("SKIP_NO_PRIVATE_KEY", row["ddns"])
            continue
        reality["minClientVer"] = "1.0.0"
        reality["minClient"] = "1.0.0"
        reality["maxClientVer"] = ""
        reality["settings"] = settings
        stream["realitySettings"] = reality
        sniff = as_obj(inbound.get("sniffing"))
        sniff["enabled"] = False
        sniff["destOverride"] = []
        updated = deepcopy(inbound)
        updated["streamSettings"] = json.dumps(stream, separators=(",", ":"))
        updated["sniffing"] = json.dumps(sniff, separators=(",", ":"))
        if isinstance(inbound.get("settings"), dict):
            updated["settings"] = json.dumps(inbound["settings"], separators=(",", ":"))
        panel_request(session, f"/panel/api/inbounds/update/{inbound['id']}", method="POST", json_body=updated)
        listed2 = panel_request(session, "/panel/api/inbounds/list") or {}
        after = next(i for i in (listed2.get("obj") or []) if i.get("id") == inbound.get("id"))
        reality2 = as_obj(as_obj(after.get("streamSettings")).get("realitySettings"))
        print(
            "after",
            row["ddns"],
            "dest",
            reality2.get("dest"),
            "minClientVer",
            repr(reality2.get("minClientVer")),
            "privateKey",
            "present" if (reality2.get("privateKey") or "").strip() else "MISSING",
        )
print("done")
PY
docker cp /tmp/af-minclient.py "$API:/tmp/af-minclient.py"
docker exec -w /app -e PYTHONPATH=/app "$API" python /tmp/af-minclient.py
