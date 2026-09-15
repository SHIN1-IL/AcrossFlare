#!/usr/bin/env bash
# Align Tokyo + LA(A) REALITY dest/SNI to www.microsoft.com and sync keys from 3x-ui into Node.
# Run on origin VPS. Does not print full keys.
set -euo pipefail
PG_CONTAINER="${PG_CONTAINER:-acrossflare-postgres}"
PG_USER="${POSTGRES_USER:-acrossflare}"
PG_DB="${POSTGRES_DB:-acrossflare}"
API="${API_CONTAINER:-acrossflare-api-1}"
SNI="${REALITY_SNI:-www.microsoft.com}"

docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -tA <<'SQL' > /tmp/af-nodes.json
SELECT json_agg(json_build_object(
  'id', n.id, 'ddns', n.ddns, 'host', n.host, 'port', n.port,
  'username', n.username, 'password', n.password, 'inboundId', n."inboundId",
  'dbPbk', n."realityPublicKey", 'dbSid', n."realityShortId", 'dbSni', n."realityServerName"
))
FROM "Node" n
WHERE n.ddns IN ('node-tokyo.acrossflare.com', 'node-la-a.acrossflare.com');
SQL

docker cp /tmp/af-nodes.json "$API:/tmp/af-nodes.json"

cat > /tmp/af-align-reality.py <<'PY'
import hashlib
import json
from copy import deepcopy
from app.xui_client import XuiPanelTarget, login, panel_request

sni = "www.microsoft.com"
dest = f"{sni}:443"

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
    return hashlib.sha256(raw.encode()).hexdigest()[:10]

nodes = json.load(open("/tmp/af-nodes.json")) or []
sync_rows = []
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
        stream = as_obj(inbound.get("streamSettings"))
        reality = as_obj(stream.get("realitySettings"))
        settings = as_obj(reality.get("settings"))
        short_ids = reality.get("shortIds") or []
        if isinstance(short_ids, str):
            short_ids = [short_ids]
        panel_pbk = (settings.get("publicKey") or "").strip()
        panel_sid = ""
        for item in short_ids:
            if str(item).strip():
                panel_sid = str(item).strip()
                break
        before_dest = reality.get("dest") or reality.get("target")
        before_names = reality.get("serverNames")
        print(
            "before",
            row["ddns"],
            "remark",
            inbound.get("remark"),
            "port",
            inbound.get("port"),
            "listen",
            inbound.get("listen") or "0.0.0.0",
            "dest",
            before_dest,
            "serverNames",
            before_names,
            "pbk",
            fp(panel_pbk),
            "sid",
            panel_sid or "empty",
            "dbPbk",
            fp(row.get("dbPbk") or ""),
            "dbSid",
            (row.get("dbSid") or "").strip() or "empty",
            "dbSni",
            row.get("dbSni"),
            "keys_match",
            fp(panel_pbk) == fp(row.get("dbPbk") or ""),
            "sid_match",
            panel_sid == (row.get("dbSid") or "").strip(),
            "sni_in_inbound",
            sni in (before_names or []),
        )
        reality["dest"] = dest
        reality["target"] = dest
        reality["serverNames"] = [sni]
        reality["minClientVer"] = "1.0.0"
        reality["minClient"] = "1.0.0"
        settings["serverName"] = sni
        settings["fingerprint"] = settings.get("fingerprint") or "chrome"
        reality["settings"] = settings
        stream["security"] = "reality"
        stream["network"] = stream.get("network") or "tcp"
        stream["realitySettings"] = reality
        updated = deepcopy(inbound)
        updated["streamSettings"] = json.dumps(stream, separators=(",", ":"))
        panel_request(session, f"/panel/api/inbounds/update/{inbound['id']}", method="POST", json_body=updated)
        print("updated", row["ddns"], dest)
        sync_rows.append({"id": row["id"], "pbk": panel_pbk, "sid": panel_sid, "sni": sni})
    if not matched:
        print("NO_INBOUND", row["ddns"], "inboundId", want)
json.dump(sync_rows, open("/tmp/af-reality-sync.json", "w"))
print("panel_patch_done", len(sync_rows))
PY

docker cp /tmp/af-align-reality.py "$API:/tmp/af-align-reality.py"
docker exec -w /app -e PYTHONPATH=/app "$API" python /tmp/af-align-reality.py
docker cp "$API:/tmp/af-reality-sync.json" /tmp/af-reality-sync.json

python3 - <<'PY'
import json, subprocess, os
rows = json.load(open("/tmp/af-reality-sync.json"))
pg = os.environ.get("PG_CONTAINER", "acrossflare-postgres")
user = os.environ.get("POSTGRES_USER", "acrossflare")
db = os.environ.get("POSTGRES_DB", "acrossflare")
for row in rows:
    pbk = row["pbk"].replace("'", "''")
    sid = row["sid"].replace("'", "''")
    sni = row["sni"].replace("'", "''")
    nid = row["id"].replace("'", "''")
    sql = (
        'UPDATE "Node" SET '
        f"\"realityPublicKey\" = '{pbk}', "
        f"\"realityShortId\" = '{sid}', "
        f"\"realityServerName\" = '{sni}', "
        f"\"realityFingerprint\" = COALESCE(NULLIF(\"realityFingerprint\", ''), 'chrome'), "
        '"updatedAt" = NOW() '
        f"WHERE id = '{nid}';"
    )
    subprocess.check_call(
        ["docker", "exec", "-i", pg, "psql", "-U", user, "-d", db, "-v", "ON_ERROR_STOP=1", "-c", sql]
    )
    print("db_synced", nid, "sni", sni, "sid", sid or "empty")
print("db_sync_done")
PY

docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -tA <<'SQL'
SELECT n.ddns, n."realityServerName", length(n."realityPublicKey"), n."realityShortId"
FROM "Node" n
WHERE n.ddns IN ('node-tokyo.acrossflare.com', 'node-la-a.acrossflare.com')
ORDER BY n.ddns;
SQL

echo done
