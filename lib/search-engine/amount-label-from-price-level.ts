/**
 * Google price_level → short KO/amount chip — never invent KRW when unknown.
 */

export function amountLabelFromPriceLevel(
  level: number | null | undefined,
): string | null {
  if (level == null || !Number.isFinite(level)) return null;
  const n = Math.round(level);
  if (n <= 0) return "₩";
  if (n === 1) return "₩";
  if (n === 2) return "₩₩";
  if (n === 3) return "₩₩₩";
  return "₩₩₩₩";
}
