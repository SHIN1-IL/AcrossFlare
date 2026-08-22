export const DEFAULT_HTTP_PORT = 8080;
export const DEFAULT_SOCKS_PORT = 1080;
export const DEFAULT_WG_PORT = 51820;
export const WG_SUBNET = "10.8.0";

export function rotateCooldownMs() {
  const raw = Number(process.env.ROTATE_COOLDOWN_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 15_000;
}

export function marketingHttpPort() {
  const raw = Number(process.env.MARKETING_HTTP_PORT);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_HTTP_PORT;
}

export function marketingSocksPort() {
  const raw = Number(process.env.MARKETING_SOCKS_PORT);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SOCKS_PORT;
}

export function marketingWgPort() {
  const raw = Number(process.env.MARKETING_WG_PORT);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_WG_PORT;
}
