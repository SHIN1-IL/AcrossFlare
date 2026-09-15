#!/usr/bin/env bash
# Do not run this. Cloudflare dest causes Karing "reality verification failed".
# Use align-reality-microsoft-remote.sh instead.
echo "REFUSED: Cloudflare dest breaks REALITY. Use infra/scripts/align-reality-microsoft-remote.sh" >&2
exit 1
# original body kept below for history; unreachable
set -euo pipefail
PG_CONTAINER="${PG_CONTAINER:-acrossflare-postgres}"
PG_USER="${POSTGRES_USER:-acrossflare}"
PG_DB="${POSTGRES_DB:-acrossflare}"
SNI="www.cloudflare.com"
DEST="${SNI}:443"

docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=1 \
  -c "UPDATE \"Node\" SET \"realityServerName\" = '${SNI}', \"updatedAt\" = NOW() WHERE ddns IN ('node-tokyo.acrossflare.com','node-la-a.acrossflare.com');"

docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -tA <<'SQL' > /tmp/af-nodes.json
SELECT json_agg(json_build_object(
  'id', n.id, 'host', n.host, 'port', n.port,
  'username', n.username, 'password', n.password, 'inboundId', n."inboundId"
))
FROM "Node" n
WHERE n.ddns IN ('node-tokyo.acrossflare.com', 'node-la-a.acrossflare.com');
SQL

docker cp /tmp/af-nodes.json acrossflare-api-1:/tmp/af-nodes.json
cat > /tmp/af-patch-reality.py <<'PY'
import json
from copy import deepcopy
from app.xui_client import XuiPanelTarget, login, panel_request

sni = "www.cloudflare.com"
dest = f"{sni}:443"
nodes = json.load(open("/tmp/af-nodes.json")) or []

def as_obj(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {}
    return value if isinstance(value, dict) else {}

for row in nodes:
    session = login(XuiPanelTarget(id=row["id"], host=row["host"], port=int(row["port"]), username=row["username"], password=row["password"]))
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
        reality["dest"] = dest
        reality["target"] = dest
        reality["serverNames"] = [sni]
        reality["minClient"] = ""
        reality["minClientVer"] = ""
        settings["serverName"] = sni
        settings["fingerprint"] = settings.get("fingerprint") or "chrome"
        reality["settings"] = settings
        stream["security"] = "reality"
        stream["realitySettings"] = reality
        updated = deepcopy(inbound)
        updated["streamSettings"] = json.dumps(stream, separators=(",", ":"))
        panel_request(session, f"/panel/api/inbounds/update/{inbound['id']}", method="POST", json_body=updated)
        print("updated", row["id"], inbound.get("remark"), dest)
print("done")
PY
docker cp /tmp/af-patch-reality.py acrossflare-api-1:/tmp/af-patch-reality.py
docker exec -w /app -e PYTHONPATH=/app acrossflare-api-1 python /tmp/af-patch-reality.py
