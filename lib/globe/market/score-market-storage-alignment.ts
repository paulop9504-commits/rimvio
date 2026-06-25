import {
  parseStorageGb,
  storageTierIndex,
} from "@/lib/globe/market/parse-storage-gb";

/**
 * Storage match thresholds — tune here without touching scorer wiring.
 * Seeking 256GB + listing 256GB → 1.0 (exact tier).
 * Listing one tier above seeking → 1.0 (upgrade OK).
 */
export const MARKET_STORAGE_MATCH_THRESHOLDS = {
  /** When either side has no storage slot. */
  missingNeutral: 0.55,
  /** Exact tier or listing tier strictly above seeking. */
  exactOrUpgrade: 1,
  /** Listing one tier below seeking (e.g. seek 256, list 128). */
  oneTierBelow: 0.72,
  /** Listing two tiers below seeking. */
  twoTiersBelow: 0.38,
  /** Three or more tiers below — hard miss. */
  hardMiss: 0.12,
} as const;

export function scoreMarketStorageAlignment(input: {
  seekingGb: string | number | boolean | null | undefined;
  listingGb: string | number | boolean | null | undefined;
}): number {
  const seekGb = parseStorageGb(input.seekingGb);
  const listGb = parseStorageGb(input.listingGb);

  if (!Number.isFinite(seekGb ?? NaN) || !Number.isFinite(listGb ?? NaN)) {
    return MARKET_STORAGE_MATCH_THRESHOLDS.missingNeutral;
  }

  const seekTier = storageTierIndex(seekGb as number);
  const listTier = storageTierIndex(listGb as number);
  const tierDelta = seekTier - listTier;

  if (tierDelta <= 0) {
    return MARKET_STORAGE_MATCH_THRESHOLDS.exactOrUpgrade;
  }
  if (tierDelta === 1) {
    return MARKET_STORAGE_MATCH_THRESHOLDS.oneTierBelow;
  }
  if (tierDelta === 2) {
    return MARKET_STORAGE_MATCH_THRESHOLDS.twoTiersBelow;
  }
  return MARKET_STORAGE_MATCH_THRESHOLDS.hardMiss;
}
