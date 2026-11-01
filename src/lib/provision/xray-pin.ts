/** Xray 26.9.8+ requires an ML-KEM key share Karing does not send. */
export const KARING_XRAY_TAG = "v26.7.28";

export function xrayNeedsKaringPin(version: string) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!match) {
    return false;
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  return major > 26 || (major === 26 && (minor > 9 || (minor === 9 && patch >= 8)));
}

export function xrayVersionFromStatus(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const obj = (payload as { obj?: unknown }).obj;
  if (!obj || typeof obj !== "object") {
    return "";
  }
  const row = obj as { xray?: { version?: unknown }; xrayVersion?: unknown };
  if (row.xray && typeof row.xray.version === "string") {
    return row.xray.version;
  }
  return typeof row.xrayVersion === "string" ? row.xrayVersion : "";
}
