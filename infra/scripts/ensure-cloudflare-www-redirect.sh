#!/usr/bin/env bash
# 301 www.acrossflare.com to the apex at the Cloudflare edge, before cache.
# A cached www HTML 200 would hide an origin redirect until that object expires.
# Preserves other redirect rules. Missing permission is a warning, not a failed deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/infra/scripts/edge-common.sh"

edge_load_dotenv "${EDGE_ENV_FILE:-$ROOT/.env}"

if [[ -z "${CLOUDFLARE_ZONE_ID:-}" || -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "SKIP: set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN to update the www redirect."
  exit 0
fi

API="https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/rulesets/phases/http_request_dynamic_redirect/entrypoint"
EXPR='(http.host eq "www.acrossflare.com")'

echo "==> Cloudflare www redirect zone=$CLOUDFLARE_ZONE_ID"

current="$(curl -sS --max-time 30 -X GET "$API" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json")"

if echo "$current" | grep -q '"code":10000\|"code":9109\|Authentication error\|does not have permission'; then
  echo "WARN: token cannot read redirect rules: $current" >&2
  exit 0
fi

python3 - "$current" "$EXPR" <<'PY' > /tmp/acrossflare-www-redirect.json
import json, sys
raw, expression = sys.argv[1], sys.argv[2]
body = json.loads(raw)
result = body.get("result") or {}
rules = list(result.get("rules") or [])
description = "Redirect www to apex"
rule = {
    "description": description,
    "expression": expression,
    "action": "redirect",
    "enabled": True,
    "action_parameters": {
        "from_value": {
            "status_code": 301,
            "preserve_query_string": True,
            "target_url": {
                "expression": 'concat("https://acrossflare.com", http.request.uri.path)'
            },
        }
    },
}
for i, existing in enumerate(rules):
    if existing.get("description") == description or existing.get("expression") == expression:
        kept = {k: existing[k] for k in ("id", "ref") if k in existing}
        rules[i] = {**kept, **rule}
        break
else:
    rules.append(rule)
print(json.dumps({"rules": rules}))
PY

resp="$(curl -sS --max-time 30 -X PUT "$API" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data @/tmp/acrossflare-www-redirect.json)"
rm -f /tmp/acrossflare-www-redirect.json

if echo "$resp" | grep -q '"success":true'; then
  echo "==> www redirect updated"
  exit 0
fi

echo "WARN: www redirect update failed: $resp" >&2
exit 0
