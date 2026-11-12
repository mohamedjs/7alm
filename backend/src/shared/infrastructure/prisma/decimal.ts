/** Prisma returns NUMERIC as Decimal; the API contract uses plain numbers. */
export function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber(): number }).toNumber();
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function numOrNull(value: unknown): number | null {
  return value === null || value === undefined ? null : num(value);
}

/** ISO string for a Date (API contract uses ISO strings like PostgREST did). */
export function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}
