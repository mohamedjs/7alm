/** Round to 2 decimals (piastres); non-finite input becomes 0. */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
