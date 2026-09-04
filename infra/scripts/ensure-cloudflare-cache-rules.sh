#!/usr/bin/env bash
# Ensure Cloudflare Cache Rules: marketing HTML eligible + origin TTL, Next static 1 month.
# Custom cache keys (ignore cookies) are Enterprise-only; on Free/Pro we still force Eligible for cache.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/infra/scripts/edge-common.sh"

edge_load_dotenv "${EDGE_ENV_FILE:-$ROOT/.env}"

if [[ -z "${CLOUDFLARE_ZONE_ID:-}" || -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "SKIP: set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN to update cache rules."
  exit 0
fi

MARKETING_EXPR='(http.host in {"acrossflare.com" "www.acrossflare.com"}) and (http.request.uri.path in {"/en" "/ko" "/zh" "/ja" "/en/standard" "/ko/standard" "/zh/standard" "/ja/standard" "/en/hybrid" "/ko/hybrid" "/zh/hybrid" "/ja/hybrid" "/en/workspace" "/ko/workspace" "/zh/workspace" "/ja/workspace" "/en/pricing" "/ko/pricing" "/zh/pricing" "/ja/pricing" "/en/terms" "/ko/terms" "/zh/terms" "/ja/terms" "/en/privacy" "/ko/privacy" "/zh/privacy" "/ja/privacy" "/en/login" "/ko/login" "/zh/login" "/ja/login" "/en/signup" "/ko/signup" "/zh/signup" "/ja/signup"})'
STATIC_EXPR='(http.host in {"acrossflare.com" "www.acrossflare.com"}) and (starts_with(http.request.uri.path, "/_next/static/"))'

API="https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/rulesets/phases/http_request_cache_settings/entrypoint"

echo "==> Cloudflare cache rules zone=$CLOUDFLARE_ZONE_ID"

current="$(curl -sS --max-time 30 -X GET "$API" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json")"

if echo "$current" | grep -q '"code":10000\|"code":9109\|Authentication error\|does not have permission'; then
  echo "WARN: token cannot read cache rules: $current" >&2
  exit 0
fi

python3 - "$current" "$MARKETING_EXPR" "$STATIC_EXPR" <<'PY' > /tmp/acrossflare-cache-rules.json
import json, sys
raw, marketing_expr, static_expr = sys.argv[1], sys.argv[2], sys.argv[3]
body = json.loads(raw)
result = body.get("result") or {}
rules = list(result.get("rules") or [])

def upsert(description, expression, action_parameters):
    for i, rule in enumerate(rules):
        if rule.get("description") == description or rule.get("expression") == expression:
            rules[i] = {
                **{k: rule[k] for k in ("id", "ref") if k in rule},
                "description": description,
                "expression": expression,
                "action": "set_cache_settings",
                "enabled": True,
                "action_parameters": action_parameters,
            }
            return
    rules.append({
        "description": description,
        "expression": expression,
        "action": "set_cache_settings",
        "enabled": True,
        "action_parameters": action_parameters,
    })

upsert("Marketing HTML", marketing_expr, {
    "cache": True,
    "edge_ttl": {"mode": "respect_origin"},
    "origin_cache_control": True,
    # Default cache key is host+path+query (no cookies). Explicitly omit cookie so
    # logged-in af_session does not fragment the key on plans that allow custom keys.
    "cache_key": {
        "custom_key": {
            "query_string": {"include": "*"},
            "header": {"exclude_origin": True},
            "cookie": {"check_presence": [], "include": []},
        }
    },
})
upsert("Next static", static_expr, {
    "cache": True,
    "edge_ttl": {"mode": "override_origin", "default": 2678400},
    "origin_cache_control": True,
})

out = {"rules": rules}
print(json.dumps(out))
PY

resp="$(curl -sS --max-time 30 -X PUT "$API" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data @/tmp/acrossflare-cache-rules.json)"
rm -f /tmp/acrossflare-cache-rules.json

if echo "$resp" | grep -q '"success":true'; then
  echo "==> cache rules updated"
  exit 0
fi

# Retry marketing rule without custom cache key (Free/Pro reject cookie cache keys).
python3 - "$current" "$MARKETING_EXPR" "$STATIC_EXPR" <<'PY' > /tmp/acrossflare-cache-rules.json
import json, sys
raw, marketing_expr, static_expr = sys.argv[1], sys.argv[2], sys.argv[3]
body = json.loads(raw)
result = body.get("result") or {}
rules = list(result.get("rules") or [])

def upsert(description, expression, action_parameters):
    for i, rule in enumerate(rules):
        if rule.get("description") == description or rule.get("expression") == expression:
            rules[i] = {
                **{k: rule[k] for k in ("id", "ref") if k in rule},
                "description": description,
                "expression": expression,
                "action": "set_cache_settings",
                "enabled": True,
                "action_parameters": action_parameters,
            }
            return
    rules.append({
        "description": description,
        "expression": expression,
        "action": "set_cache_settings",
        "enabled": True,
        "action_parameters": action_parameters,
    })

upsert("Marketing HTML", marketing_expr, {
    "cache": True,
    "edge_ttl": {"mode": "respect_origin"},
    "origin_cache_control": True,
})
upsert("Next static", static_expr, {
    "cache": True,
    "edge_ttl": {"mode": "override_origin", "default": 2678400},
    "origin_cache_control": True,
})
print(json.dumps({"rules": rules}))
PY

resp="$(curl -sS --max-time 30 -X PUT "$API" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data @/tmp/acrossflare-cache-rules.json)"
rm -f /tmp/acrossflare-cache-rules.json

if echo "$resp" | grep -q '"success":true'; then
  echo "==> cache rules updated (Eligible for cache; custom cookie key not available on this plan)"
  exit 0
fi

echo "WARN: cache rules update failed: $resp" >&2
exit 0
