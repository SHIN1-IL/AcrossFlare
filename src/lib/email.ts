export function normalizeEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }

  return trimmed.includes("@") ? trimmed : `${trimmed}@acrossflare.com`;
}
