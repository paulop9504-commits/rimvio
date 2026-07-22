import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";

const NEAR_MATCH_KM = 0.18;

function lodgingRowKey(row: ContextLodgingInventoryRow): string {
  const placeId = row.placeId?.trim();
  if (placeId) {
    return `id:${placeId}`;
  }
  return `name:${normalizeLodgingName(row.name)}`;
}

function normalizeLodgingName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "");
}

function lodgingPhotoScore(row: ContextLodgingInventoryRow): number {
  const images = row.images?.length ?? 0;
  const providerBoost = row.provider === "liteapi" ? 40 : 0;
  const priceBoost = row.priceKrw != null && row.priceKrw > 0 ? 10 : 0;
  const offerBoost = (row.roomOffers?.length ?? 0) > 0 ? 20 : 0;
  return images + providerBoost + priceBoost + offerBoost;
}

function nearEnough(
  left: ContextLodgingInventoryRow,
  right: ContextLodgingInventoryRow,
): boolean {
  if (
    !Number.isFinite(left.lat) ||
    !Number.isFinite(left.lng) ||
    !Number.isFinite(right.lat) ||
    !Number.isFinite(right.lng)
  ) {
    return false;
  }
  return haversineKm(left.lat, left.lng, right.lat, right.lng) <= NEAR_MATCH_KM;
}

function namesLikelySame(left: string, right: string): boolean {
  const a = normalizeLodgingName(left);
  const b = normalizeLodgingName(right);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  return a.includes(b) || b.includes(a);
}

/** Fuse LiteAPI rates/offers with Places photos when placeIds differ. */
export function fuseLodgingInventoryRows(
  primary: ContextLodgingInventoryRow,
  secondary: ContextLodgingInventoryRow,
): ContextLodgingInventoryRow {
  const primaryImages = primary.images ?? [];
  const secondaryImages = secondary.images ?? [];
  const useSecondaryPhotos =
    secondaryImages.length > primaryImages.length ||
    (primaryImages.length === 0 && secondaryImages.length > 0);
  const images = useSecondaryPhotos ? secondaryImages : primaryImages;

  const litePrimary = primary.provider === "liteapi";
  const liteSecondary = secondary.provider === "liteapi";
  const priceKrw =
    litePrimary || (primary.priceKrw != null && primary.priceKrw > 0)
      ? (primary.priceKrw ?? secondary.priceKrw ?? null)
      : (secondary.priceKrw ?? primary.priceKrw ?? null);

  const roomOffers =
    (primary.roomOffers?.length ?? 0) > 0
      ? primary.roomOffers
      : secondary.roomOffers;

  return {
    ...secondary,
    ...primary,
    name: primary.name.trim() || secondary.name,
    placeId:
      litePrimary || liteSecondary
        ? (litePrimary ? primary.placeId : secondary.placeId) ??
          primary.placeId ??
          secondary.placeId
        : (primary.placeId ?? secondary.placeId),
    images,
    priceKrw,
    roomOffers,
    photoSource: useSecondaryPhotos
      ? (secondary.photoSource ?? primary.photoSource)
      : (primary.photoSource ?? secondary.photoSource),
    photoConfidence: useSecondaryPhotos
      ? (secondary.photoConfidence ?? primary.photoConfidence)
      : (primary.photoConfidence ?? secondary.photoConfidence),
    provider: litePrimary || liteSecondary ? "liteapi" : primary.provider,
    partnerLabel: primary.partnerLabel ?? secondary.partnerLabel,
    liteapiHotelId: primary.liteapiHotelId ?? secondary.liteapiHotelId,
    checkInIso: primary.checkInIso ?? secondary.checkInIso,
    checkOutIso: primary.checkOutIso ?? secondary.checkOutIso,
    stayWindow: primary.stayWindow ?? secondary.stayWindow,
    rating: primary.rating ?? secondary.rating,
    reviewCount: primary.reviewCount ?? secondary.reviewCount,
  };
}

function findFuzzyMatch(
  row: ContextLodgingInventoryRow,
  pool: readonly ContextLodgingInventoryRow[],
): ContextLodgingInventoryRow | null {
  for (const candidate of pool) {
    if (!namesLikelySame(row.name, candidate.name)) {
      continue;
    }
    if (nearEnough(row, candidate) || !Number.isFinite(row.lat)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Prefer LiteAPI (live rates + photos); fuse Places for photo/coverage fill.
 */
export function mergeLodgingInventoryRows(input: {
  primary: readonly ContextLodgingInventoryRow[];
  secondary: readonly ContextLodgingInventoryRow[];
  maxResults: number;
}): ContextLodgingInventoryRow[] {
  const secondaryLeft = [...input.secondary];
  const mergedPrimary: ContextLodgingInventoryRow[] = [];

  for (const row of input.primary) {
    const fuzzy = findFuzzyMatch(row, secondaryLeft);
    if (fuzzy) {
      const index = secondaryLeft.indexOf(fuzzy);
      if (index >= 0) {
        secondaryLeft.splice(index, 1);
      }
      mergedPrimary.push(fuseLodgingInventoryRows(row, fuzzy));
      continue;
    }
    const exact = secondaryLeft.find(
      (candidate) => lodgingRowKey(candidate) === lodgingRowKey(row),
    );
    if (exact) {
      const index = secondaryLeft.indexOf(exact);
      if (index >= 0) {
        secondaryLeft.splice(index, 1);
      }
      mergedPrimary.push(
        lodgingPhotoScore(exact) > lodgingPhotoScore(row)
          ? fuseLodgingInventoryRows(row, exact)
          : fuseLodgingInventoryRows(exact, row),
      );
      continue;
    }
    mergedPrimary.push(row);
  }

  const extras = secondaryLeft.sort(
    (left, right) => lodgingPhotoScore(right) - lodgingPhotoScore(left),
  );

  return [...mergedPrimary, ...extras].slice(0, Math.max(1, input.maxResults));
}

export function lodgingInventoryHasLivePhotos(
  rows: readonly ContextLodgingInventoryRow[],
): boolean {
  return rows.some(
    (row) =>
      (row.images?.length ?? 0) > 0 &&
      row.provider !== "mock" &&
      row.photoSource !== "mock",
  );
}
