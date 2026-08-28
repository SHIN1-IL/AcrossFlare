# Origin infrastructure (F-4)

Internet → Cloudflare (Proxy, SSL Full Strict, WAF) → origin Caddy :443 →

* `web:3000` — `acrossflare.com` PWA / console
* `api:8000` — `acrossflare.com/api/v1/subscription*`
* `vaultwarden:80` — `vault.acrossflare.com`
* `syncthing:8384` — `sync.acrossflare.com`

3x-ui stays on node VPS hosts. Do not add it to the origin Compose file. Map each node to a DDNS name (`node-*.acrossflare.com`) and keep those records **DNS only** (grey cloud).

Local development is unchanged: `npm run db:up` + `npm run dev`.

Target: keep the origin container set under **300MB RAM**, with **1GB swap** on the VPS (`sh infra/scripts/setup-swap.sh`).

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

6. **Cache Rule** (marketing HTML only): hostname `acrossflare.com` or `www.acrossflare.com`, URI Path matches `^/(en|ko|zh|ja)(/standard|/hybrid|/workspace|/pricing|/terms|/privacy)?$`. Eligible for cache; ignore the `af_session` cookie in the cache key. Origin already sends `CDN-Cache-Control`. Do **not** cache `/login`, `/signup`, `/support`, `/checkout`, `/app`, `/admin`, `/dashboard`, or `/api`.

## Deploy

1. Copy `.env.example` → `.env` and set `AUTH_SECRET`, `VAULTWARDEN_ADMIN_TOKEN`, live payment/provision values, and `APP_URL=https://acrossflare.com`.
2. Place Origin CA files in `infra/certs/`.
3. `sh infra/scripts/setup-swap.sh` once on the VPS.
4. `npm run origin:up`
5. Confirm `https://acrossflare.com/api/health`, `https://acrossflare.com/dashboard`, `https://vault.acrossflare.com`, and `https://sync.acrossflare.com`.

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
