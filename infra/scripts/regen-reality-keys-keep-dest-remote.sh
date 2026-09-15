#!/usr/bin/env bash
# Dump dest/privateKey presence, then regenerate REALITY keypair in-place.
# Keeps dest/serverNames/sniffing as they are. Syncs public key/sid/sni to Node.
set -euo pipefail
PG_CONTAINER="${PG_CONTAINER:-acrossflare-postgres}"
PG_USER="${POSTGRES_USER:-acrossflare}"
PG_DB="${POSTGRES_DB:-acrossflare}"
API="${API_CONTAINER:-acrossflare-api-1}"

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

python3 - <<'PY'
import json, os, re, subprocess, secrets, base64

def b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")

def hex_block(text: str, title: str) -> bytes:
    match = re.search(rf"{re.escape(title)}\s*:\s*((?:[0-9A-Fa-f:\s]+))", text)
    if not match:
        raise SystemExit(f"openssl missing {title}: {text[:400]}")
    hexed = re.sub(r"[^0-9A-Fa-f]", "", match.group(1))
    return bytes.fromhex(hexed)

def new_x25519():
    pem = subprocess.check_output(["openssl", "genpkey", "-algorithm", "X25519"])
    text = subprocess.check_output(["openssl", "pkey", "-text", "-noout"], input=pem).decode()
    priv_raw = hex_block(text, "priv")
    pub_raw = hex_block(text, "pub")
    if len(priv_raw) > 32:
        priv_raw = priv_raw[-32:]
    if len(pub_raw) != 32 or len(priv_raw) != 32:
        raise SystemExit(f"bad x25519 sizes {len(priv_raw)} {len(pub_raw)}")
    return b64url(priv_raw), b64url(pub_raw)

nodes = json.load(open("/tmp/af-nodes.json")) or []
keys = []
for row in nodes:
    priv, pub = new_x25519()
    keys.append({"id": row["id"], "ddns": row["ddns"], "priv": priv, "pub": pub, "sid": secrets.token_hex(4)})
json.dump(keys, open("/tmp/af-new-keys.json", "w"))
print("generated", [(k["ddns"], k["sid"]) for k in keys])
PY
docker cp /tmp/af-new-keys.json "$API:/tmp/af-new-keys.json"

cat > /tmp/af-regen-reality.py <<'PY'
import hashlib
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

def fp(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return "empty"
    return hashlib.sha256(raw.encode()).hexdigest()[:12]

def dump_one(label, row, inbound):
    stream = as_obj(inbound.get("streamSettings"))
    reality = as_obj(stream.get("realitySettings"))
    settings = as_obj(reality.get("settings"))
    priv = (reality.get("privateKey") or "").strip()
    pbk = (settings.get("publicKey") or "").strip()
    print(
        label,
        row["ddns"],
        "remark",
        inbound.get("remark"),
        "dest",
        reality.get("dest") or reality.get("target"),
        "serverNames",
        reality.get("serverNames"),
        "sniffing",
        as_obj(inbound.get("sniffing")).get("enabled"),
        "privateKey",
        "present" if priv else "MISSING",
        "pbk_fp",
        fp(pbk),
        "sid",
        reality.get("shortIds"),
        "dbSni",
        row.get("dbSni"),
        "dbSid",
        row.get("dbSid"),
        "dbPbk",
        fp(row.get("dbPbk") or ""),
    )
    return stream, reality, settings, pbk

nodes = json.load(open("/tmp/af-nodes.json")) or []
key_by_id = {k["id"]: k for k in json.load(open("/tmp/af-new-keys.json"))}
sync_rows = []
print("=== BEFORE ===")
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
        stream, reality, settings, old_pbk = dump_one("before", row, inbound)
        bundle = key_by_id[row["id"]]
        priv, pub, sid = bundle["priv"], bundle["pub"], bundle["sid"]
        dest = "www.bing.com:443"
        names = ["www.bing.com"]
        sni = "www.bing.com"
        reality["privateKey"] = priv
        reality["shortIds"] = [sid]
        reality["dest"] = dest
        reality["target"] = dest
        reality["serverNames"] = names
        reality["minClientVer"] = "1.0.0"
        reality["minClient"] = "1.0.0"
        settings["publicKey"] = pub
        settings["serverName"] = sni
        settings["fingerprint"] = settings.get("fingerprint") or "chrome"
        if not (settings.get("spiderX") or "").strip():
            settings["spiderX"] = "/"
        reality["settings"] = settings
        stream["security"] = "reality"
        stream["network"] = stream.get("network") or "tcp"
        stream["realitySettings"] = reality
        sniff = as_obj(inbound.get("sniffing"))
        sniff["enabled"] = False
        sniff["destOverride"] = []
        updated = deepcopy(inbound)
        for key in ("streamSettings", "settings", "sniffing"):
            val = updated.get(key)
            if key == "streamSettings":
                updated[key] = json.dumps(stream, separators=(",", ":"))
            elif key == "sniffing":
                updated[key] = json.dumps(sniff, separators=(",", ":"))
            elif isinstance(val, dict):
                updated[key] = json.dumps(val, separators=(",", ":"))
        panel_request(session, f"/panel/api/inbounds/update/{inbound['id']}", method="POST", json_body=updated)
        listed2 = panel_request(session, "/panel/api/inbounds/list") or {}
        after_in = next(i for i in (listed2.get("obj") or []) if i.get("id") == inbound.get("id"))
        dump_one("after", row, after_in)
        sync_rows.append({"id": row["id"], "pbk": pub, "sid": sid, "sni": sni})
        print("regen", row["ddns"], "old_pbk", fp(old_pbk), "new_pbk", fp(pub), "sid", sid, "sni", sni)

json.dump(sync_rows, open("/tmp/af-reality-sync.json", "w"))
print("panel_done", len(sync_rows))
PY

docker cp /tmp/af-regen-reality.py "$API:/tmp/af-regen-reality.py"
docker exec -w /app -e PYTHONPATH=/app "$API" python /tmp/af-regen-reality.py
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
    subprocess.check_call(["docker", "exec", "-i", pg, "psql", "-U", user, "-d", db, "-v", "ON_ERROR_STOP=1", "-c", sql])
    print("db_synced", nid, "sni", sni, "sid", sid)
print("db_sync_done")
PY
echo done
