export function nextHomePageTop(tops: number[], from: number, to: number, viewport: number) {
  if (tops.length === 0) return to;
  const threshold = Math.min(72, Math.max(1, viewport) * 0.12);
  let index = 0;
  let best = Number.POSITIVE_INFINITY;
  tops.forEach((top, item) => {
    const distance = Math.abs(top - from);
    if (distance < best) {
      best = distance;
      index = item;
    }
  });
  const delta = to - from;
  if (delta > threshold) index = Math.min(tops.length - 1, index + 1);
  else if (delta < -threshold) index = Math.max(0, index - 1);
  return tops[index] ?? to;
}
