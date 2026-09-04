# Origin infrastructure (F-4)

Internet → Cloudflare (Proxy, SSL Full Strict, WAF) → origin Caddy :443 →

* `web:3000` — `acrossflare.com` PWA / console
* `api:8000` — `acrossflare.com/api/v1/subscription*`
* `vaultwarden:80` — `vault.acrossflare.com`
* `syncthing:8384` — `sync.acrossflare.com`

3x-ui stays on node VPS hosts. Do not add it to the origin Compose file. Map each node to a DDNS name (`node-*.acrossflare.com`) and keep those records **DNS only** (grey cloud).

Local development is unchanged: `npm run db:up` + `npm run dev`.

Target: keep steady origin containers under **~830MB RAM caps** on the **2GB Vultr** VPS (+ **1GB swap** via `sh infra/scripts/setup-swap.sh`). Marketing HTML still uses Cloudflare HIT + warm cron so Free PoPs do not hammer the origin. Optional later: **4GB** if `/app`/`/admin` load grows.

## Cloudflare

1. Zone `acrossflare.com`.
2. **SSL/TLS → Overview:** Full (Strict).
3. **SSL/TLS → Origin Server:** create an Origin CA cert for `acrossflare.com`, `www.acrossflare.com`, `vault.acrossflare.com`, `sync.acrossflare.com`. Save as `infra/certs/origin.pem` and `infra/certs/origin.key`.
4. **WAF:** keep the managed ruleset. Payment webhooks stay on `https://acrossflare.com/api/v1/payments/webhook` (orange cloud).
5. DNS:

| Name | Type | Target | Proxy |
|---|---|---|---|
| `@` | A/AAAA | origin VPS | Proxied |
| `www` | CNAME | `@` | Proxied |
| `vault` | CNAME | `@` | Proxied |
| `sync` | CNAME | `@` | Proxied |
| `node-*` | A | that node’s public IP | DNS only |

6. **Cache Rule** (marketing HTML only, Free/Pro — do not use `matches` regex): name `Marketing HTML`, custom expression editor (not the wildcard builder). Paste:

   ```
   (http.host in {"acrossflare.com" "www.acrossflare.com"}) and (http.request.uri.path in {"/en" "/ko" "/zh" "/ja" "/en/standard" "/ko/standard" "/zh/standard" "/ja/standard" "/en/hybrid" "/ko/hybrid" "/zh/hybrid" "/ja/hybrid" "/en/workspace" "/ko/workspace" "/zh/workspace" "/ja/workspace" "/en/pricing" "/ko/pricing" "/zh/pricing" "/ja/pricing" "/en/terms" "/ko/terms" "/zh/terms" "/ja/terms" "/en/privacy" "/ko/privacy" "/zh/privacy" "/ja/privacy" "/en/login" "/ko/login" "/zh/login" "/ja/login" "/en/signup" "/ko/signup" "/zh/signup" "/ja/signup"})
   ```

   Eligible for cache. Edge TTL: use origin Cache-Control, otherwise bypass. Origin already sends `CDN-Cache-Control` / `Cloudflare-CDN-Cache-Control` with `s-maxage=86400`. Deploy runs `infra/scripts/ensure-cloudflare-cache-rules.sh` to keep this rule (and Next static) in place. On Enterprise it omits cookies from the custom cache key; on Free/Pro Cloudflare’s default key is already host+path+query (no cookies) and Eligible for cache still applies with `af_session` present. Login/signup **shells** are anonymous (no session in HTML); `POST /api/auth/*` stays private. `/` is the locale redirect (`307` from `Accept-Language`); do **not** cache it or every visitor would get the same language. After changing this rule, purge `/` so a previous `/en` redirect is not reused. Do **not** cache `/support`, `/checkout`, `/app`, `/admin`, `/dashboard`, or `/api`. Do **not** use `https://acrossflare.com/*`.

   **Caching → Configuration → Browser Cache TTL:** Respect Existing Headers. Do not leave the zone default (often 4 hours). Origin marketing HTML uses `max-age=0` so browsers revalidate while the edge keeps `s-maxage=86400`.

   **Speed (Caching → Tiered Cache):** enable **Smart Tiered Cache** so quiet Free PoPs refill from a CF tier instead of the origin.

7. **Cache Rule** (Next static assets): name `Next static`, custom expression:

   ```
   (http.host in {"acrossflare.com" "www.acrossflare.com"}) and (starts_with(http.request.uri.path, "/_next/static/"))
   ```

   Eligible for cache. Edge TTL: 1 month.

8. **API token + warm/SLO cron (required for stable marketing speed):**
   - Cloudflare → API Tokens → Create Token → permissions **Zone → Cache Purge → Purge** (include zone `acrossflare.com`).
   - Put `CLOUDFLARE_ZONE_ID` + `CLOUDFLARE_API_TOKEN` in origin `.env` (see `.env.example`). Optional `SLO_ALERT_WEBHOOK_URL` for Slack/Discord.
   - On the VPS once: `npm run edge:cron:install` (or `sh infra/scripts/install-edge-cron.sh`) — warms all marketing URLs every **10 minutes**, SLO probe every **5 minutes**.
   - Manual: `npm run edge:purge`, `npm run edge:warm`, `npm run edge:slo`.
   - Deploy (`deploy-origin-remote.sh`) already purges (if creds set) then warms. Admin plan edits purge via the web container.

## Deploy

1. Copy `.env.example` → `.env` and set production values (see [beta-ops.md](./beta-ops.md) §1): `AUTH_SECRET`, `VAULTWARDEN_ADMIN_TOKEN`, `PROVISION_MODE=live`, `PAYMENT_MODE=live`, `APP_URL=https://acrossflare.com`, Cloudflare purge token, node/panel creds.
2. Place Origin CA files in `infra/certs/`.
3. `sh infra/scripts/setup-swap.sh` once on the VPS.
4. `npm run origin:up`
5. Confirm `https://acrossflare.com/api/health`, `https://acrossflare.com/dashboard`, `https://vault.acrossflare.com`, and `https://sync.acrossflare.com`.
6. After deploy, verify traffic cron: `docker logs acrossflare-api-1 2>&1 | grep traffic_sync_scheduler_started`.
7. Install edge cron: `npm run edge:cron:install`. Confirm `cf-cache-status: HIT` on `/en` `/ko` `/zh` `/ja`.

For beta monitoring and launch checklist, see [beta-ops.md](./beta-ops.md).

Customers open the backup PWA at `https://acrossflare.com/dashboard` after connecting Karing. Vaultwarden is `https://vault.acrossflare.com`. Syncthing GUI is `https://sync.acrossflare.com`. On first Syncthing boot, set a GUI password and enable **Skip Host check** (or `insecureSkipHostcheck`) so Caddy can proxy `sync.acrossflare.com`. Copy the API key into `SYNCTHING_API_KEY` if live provisioning should create per-user folders.

Local origin smoke test (self-signed, no Cloudflare):

```bash
npm run certs:dev
npm run origin:up
```

## Optional local 3x-ui

```bash
docker compose -f docker-compose.xui.yml up -d
```

The panel is bound to `127.0.0.1:2053`. Add it in `/admin` as a node. Do not publish 2053 on the origin VPS.
