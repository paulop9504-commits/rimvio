/** Phone storage tiers (GB) — SSOT for parse + match. */
export const MARKET_PHONE_STORAGE_TIERS_GB = [64, 128, 256, 512, 1024] as const;

export type MarketPhoneStorageTierGb = (typeof MARKET_PHONE_STORAGE_TIERS_GB)[number];

export function parseStorageGb(
  raw: string | number | boolean | null | undefined,
): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return normalizeStorageTierGb(raw);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    const match =
      trimmed.match(/(\d{2,4})\s*(?:gb|기가|g\b)/iu) ?? trimmed.match(/^(\d{2,4})$/u);
    if (!match?.[1]) {
      return null;
    }
    const value = Number.parseInt(match[1], 10);
    if (!Number.isFinite(value) || value < 16) {
      return null;
    }
    return normalizeStorageTierGb(value);
  }
  return null;
}

/** Snap arbitrary GB to nearest standard phone tier (for fuzzy labels). */
export function normalizeStorageTierGb(gb: number): number {
  let best: MarketPhoneStorageTierGb = MARKET_PHONE_STORAGE_TIERS_GB[0];
  let bestDelta = Math.abs(gb - best);
  for (const tier of MARKET_PHONE_STORAGE_TIERS_GB) {
    const delta = Math.abs(gb - tier);
    if (delta < bestDelta) {
      best = tier;
      bestDelta = delta;
    }
  }
  return best;
}

export function storageTierIndex(gb: number): number {
  const normalized = normalizeStorageTierGb(gb);
  const index = MARKET_PHONE_STORAGE_TIERS_GB.indexOf(
    normalized as MarketPhoneStorageTierGb,
  );
  return index < 0 ? 0 : index;
}
