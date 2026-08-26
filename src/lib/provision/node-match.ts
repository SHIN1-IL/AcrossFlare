export function normalizeNodeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function nodeNameMatchesCode(name: string, code: string) {
  const needle = normalizeNodeToken(code);
  if (!needle) {
    return false;
  }
  return normalizeNodeToken(name).includes(needle);
}
