# Beta operations checklist (Phase 1)

Phase 1 code is complete. Before and during a 20–50 user beta (1–2 weeks), use this checklist. Phase 2 (XrayR) stays out of scope until the thresholds at the bottom are hit.

See also: [infra.md](./infra.md) (origin deploy), [.env.example](../.env.example) (env vars).

---

## 1. Production `.env` (origin VPS)

`.env.example` defaults to `simulate`. On the **origin VPS**, confirm:

| Variable | Production value | If wrong |
|---|---|---|
| `PROVISION_MODE` | `live` | Cron, Failover, live 3x-ui provisioning all off |
| `TRAFFIC_SYNC_ENABLED` | `1` (or omit) | No 5-minute traffic sync |
| `PAYMENT_MODE` | `live` | Checkout stays local simulation |
| `APP_URL` | `https://acrossflare.com` | Wrong subscription / deep-link domain |
| `DATABASE_URL` | Production Postgres | Cron disabled |
| `XUI_API_TOKEN` + per-node creds in Admin | Match panels | Traffic pull and Failover provision fail |
| Node REALITY fields in Admin | `realityPublicKey`, `realityShortId`, `realityServerName` per node | Karing YAML missing `reality-opts`; live provision fails |
| `WG_SERVER_PUBLIC_KEY` | Set | Marketing WireGuard fails in live mode |

Cron is explicitly off when `PROVISION_MODE=simulate`:

```python
# services/api/app/config.py — traffic_sync_enabled()
if os.environ.get("PROVISION_MODE") == "simulate":
    return False
```

**After deploy — confirm scheduler:**

```bash
docker logs acrossflare-api-1 2>&1 | grep traffic_sync_scheduler_started
# expect: traffic_sync_scheduler_started interval=300s
```

---

## 2. Origin infrastructure (one-time)

On the origin VPS, in order:

1. Cloudflare Origin CA → `infra/certs/origin.pem` / `origin.key`
2. `sh infra/scripts/setup-swap.sh` (1GB swap — required on ~300MB RAM)
3. `npm run origin:up` (or redeploy)
4. Health: `https://acrossflare.com/api/health`, `/dashboard`, `vault.`, `sync.`
5. Admin: Bandwagon + RackNerd nodes **ONLINE**, API creds verified
6. `npx prisma migrate deploy` (TrafficSnapshot / TrafficSyncRun migrations)

---

## 3. Karing subscription refresh (customer-facing)

Server updates `trafficUsedGb` every ~5 minutes. Karing auto-fetches the profile at most every **24 hours** (`profile-update-interval: 24`).

Customers who hit traffic limits or Failover may not see changes in Karing immediately. Tell them to use **Manual subscription update** at the top of the Karing app.

Copy is in:

- `/support` FAQ (all locales)
- Console dashboard (Karing section + Failover banner)
- YAML `#announce` comment when traffic is exhausted or Failover is active

---

## 4. Beta validation scenarios

| Scenario | What to verify |
|---|---|
| Payment → auto provision | 3x-ui client, Vaultwarden, Syncthing, Karing QR |
| Subscription URL | `GET /api/v1/subscription/{token}` → YAML + `subscription-userinfo` |
| Traffic sync | `docker logs acrossflare-api-1 \| grep traffic_sync_complete` |
| 150GB exceeded | DB `failover=true`, RackNerd-only YAML, dashboard banner |
| Karing manual refresh | After exceed → manual update → `proxies: []` or RackNerd switch |

Optional local E2E with live 3x-ui: `scripts/live-smoke.ts` (`PROVISION_MODE=live`).

---

## 5. Daily monitoring (~5 min)

**Cron**

```bash
docker logs acrossflare-api-1 --since 1h 2>&1 | grep -E "traffic_sync_(complete|error)"
```

**Memory / swap**

```bash
docker stats --no-stream
free -h
```

**Database (periodic)**

- `TrafficSnapshot` — deltas accumulating
- `Subscription.trafficUsedGb` vs `Plan.trafficGb`
- Count of `failover=true` users

---

## 6. Known follow-ups (can run in parallel with beta)

| Item | Priority | Notes |
|---|---|---|
| Marketing seed (`wg_server_public_key_missing`) | Low | Only if Marketing live demo needed |
| `.env.example` TRAFFIC_SYNC_* docs | Done | See `.env.example` |
| Admin `simulateBanner` | Verify | Should disappear after live switch |

---

## 7. Phase 2 (XrayR) — do not start yet

Request Phase 2 design only if one of these persists:

| Signal | Threshold |
|---|---|
| Active GLOBAL users | 100–200+ |
| `traffic_sync_complete` error rate | ≥10% sustained |
| Cron lag | 5-minute cycle slipping to 10+ minutes |

Until then, keep **3x-ui + central FastAPI**.
