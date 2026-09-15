#!/usr/bin/env bash
# Apply subscription vless-default files already in /tmp/af-sub-patch onto the API container.
set -euo pipefail
API="$(docker ps --format '{{.Names}}' | grep -E 'acrossflare-api' | head -1)"
: "${API:?api container not found}"
for f in yaml_builder.py subscription.py main.py headers.py nodes.py db.py failover.py; do
  docker cp "/tmp/af-sub-patch/$f" "$API:/app/app/$f"
done
docker restart "$API"
sleep 4
docker exec -w /app -e PYTHONPATH=/app "$API" python -c 'from app.subscription import resolve_subscription; print("api_ok")'
docker logs "$API" --tail 6
echo done
