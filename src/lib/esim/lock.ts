export type EsimSaleLock = {
  enabled: boolean;
  enabledLocked: boolean;
};

/** The sale switch changes only when it is locked in. Copy saves never touch it. */
export function applyEsimSaleLock(
  current: EsimSaleLock,
  action: "lock" | "unlock",
  enabled?: boolean
): { ok: true; next: EsimSaleLock } | { ok: false; error: "locked" | "invalid" } {
  if (action === "unlock") {
    return { ok: true, next: { enabled: current.enabled, enabledLocked: false } };
  }

  if (typeof enabled !== "boolean") {
    return { ok: false, error: "invalid" };
  }

  if (current.enabledLocked && enabled !== current.enabled) {
    return { ok: false, error: "locked" };
  }

  return { ok: true, next: { enabled, enabledLocked: true } };
}
