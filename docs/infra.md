# Origin infrastructure (F-4)

Internet → Cloudflare (Proxy, SSL Full Strict, WAF) → origin Nginx :443 → `web:3000` (`acrossflare.com`) or `nextcloud:80` (`files.acrossflare.com`, VPN `10.8.0.0/24` only).

3x-ui stays on node VPS hosts. Do not add it to `docker-compose.origin.yml`. Map each node to a DDNS name (`node-*.acrossflare.com`) and keep those records **DNS only** (grey cloud).

Local development is unchanged: `npm run db:up` + `npm run dev`.

## Cloudflare

1. Zone `acrossflare.com`.
2. **SSL/TLS → Overview:** Full (Strict).
3. **SSL/TLS → Origin Server:** create an Origin CA cert for `acrossflare.com`, `www.acrossflare.com`, `files.acrossflare.com`. Save as `infra/certs/origin.pem` and `infra/certs/origin.key`.
4. **SSL/TLS → Origin Server → Authenticated Origin Pulls:** enable for the zone. Nginx fetches Cloudflare’s pull CA on first start.
5. **WAF:** keep the managed ruleset. Payment webhooks stay on `https://acrossflare.com/api/v1/payments/webhook` (orange cloud, no VPN ACL).
6. DNS:

| Name | Type | Target | Proxy |
|---|---|---|---|
| `@` | A/AAAA | origin VPS | Proxied |
| `www` | CNAME | `@` | Proxied |
| `files` | CNAME | `@` | Proxied |
| `node-*` | A | that node’s public IP | DNS only |

Update Cloudflare edge ranges with `sh infra/scripts/fetch-cloudflare-ips.sh` after they publish new prefixes.

## Deploy

1. Copy `.env.example` → `.env` and set `AUTH_SECRET`, `NEXTCLOUD_ADMIN_PASSWORD`, `NEXTCLOUD_DB_*`, live payment/provision values, and `APP_URL=https://acrossflare.com`.
2. Place Origin CA files in `infra/certs/`.
3. `npm run origin:up`
4. Confirm `https://acrossflare.com/api/health` and that `https://files.acrossflare.com` returns 403 off-VPN.

Local origin smoke test (self-signed, no Cloudflare):

```bash
npm run certs:dev
ORIGIN_PULLS=off npm run origin:up
```

## VPN ACL

After `real_ip`, `$remote_addr` is `CF-Connecting-IP`. `set_real_ip_from` is only Cloudflare ranges, so a direct origin hit cannot spoof `10.8.0.1` to pass the Nextcloud allow list.

Customers open Nextcloud only after connecting to the product VPN (`10.8.0.0/24`). The app issues `NEXTCLOUD_URL` (`https://files.acrossflare.com`) to the dashboard. OCS user creation uses `NEXTCLOUD_INTERNAL_URL` (`http://nextcloud:80`) so provisioning is not blocked by the VPN ACL.

## Optional local 3x-ui

```bash
docker compose -f docker-compose.xui.yml up -d
```

The panel is bound to `127.0.0.1:2053`. Add it in `/admin` as a node. Do not publish 2053 on the origin VPS.
