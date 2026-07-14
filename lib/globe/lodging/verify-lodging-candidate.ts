import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";

/**
 * Lodging verification gate — cut thin / unbookable / weak-identity rows
 * before personalized rank so like-probability stays high.
 *
 * `strict` = convergent / default scout
 * `relaxed` = diffuse / “다른 곳”
 * `off` = no hard cut (tests / diagnostics)
 */

export type LodgingVerificationMode = "strict" | "relaxed" | "off";

export type LodgingVerificationFailReason =
  | "coords"
  | "identity"
  | "images"
  | "bookable"
  | "photo_confidence";

export type LodgingVerificationResult = {
  readonly ok: boolean;
  readonly score100: number;
  readonly failReasons: readonly LodgingVerificationFailReason[];
};

function hasFiniteCoords(row: ContextLodgingInventoryRow): boolean {
  return Number.isFinite(row.lat) && Number.isFinite(row.lng);
}

function hasIdentity(row: ContextLodgingInventoryRow): boolean {
  const name = row.name?.trim();
  if (!name) {
    return false;
  }
  return Boolean(
    row.placeId?.trim() ||
      row.address?.trim() ||
      row.mapsUrl?.trim() ||
      row.liteapiHotelId?.trim(),
  );
}

function hasBookableSignal(row: ContextLodgingInventoryRow): boolean {
  if (row.provider === "liteapi") {
    return true;
  }
  if (row.priceKrw != null && Number.isFinite(row.priceKrw) && row.priceKrw > 0) {
    return true;
  }
  return Boolean(
    row.roomOffers?.some(
      (offer) =>
        (offer.priceKrw != null && Number.isFinite(offer.priceKrw) && offer.priceKrw > 0) ||
        Boolean(offer.providerOfferId?.trim()),
    ),
  );
}

function imageCountOk(
  row: ContextLodgingInventoryRow,
  mode: Exclude<LodgingVerificationMode, "off">,
): boolean {
  const count = row.images.length;
  if (mode === "strict") {
    return count >= 2;
  }
  return count >= 1;
}

function photoConfidenceOk(
  row: ContextLodgingInventoryRow,
  mode: Exclude<LodgingVerificationMode, "off">,
): boolean {
  if (mode === "relaxed") {
    return row.photoConfidence !== "mock" || row.provider === "liteapi";
  }
  if (row.photoConfidence === "exact_place_id" || row.photoConfidence === "strong_identity") {
    return true;
  }
  // Live inventory with gallery — treat as verified enough.
  if (row.provider === "liteapi" && row.images.length >= 2) {
    return true;
  }
  if (
    row.photoConfidence === "nearby_identity" &&
    row.images.length >= 3 &&
    hasBookableSignal(row)
  ) {
    return true;
  }
  // Unknown confidence: allow Google/places only when photos + bookable exist.
  if (
    row.photoConfidence == null &&
    row.images.length >= 2 &&
    hasBookableSignal(row) &&
    row.provider !== "mock"
  ) {
    return true;
  }
  return false;
}

/** Soft 0..100 evidence score — feeds quality/popularity dimensions. */
export function computeLodgingVerificationScore(
  row: ContextLodgingInventoryRow,
): number {
  let score = 28;
  if (hasFiniteCoords(row)) {
    score += 8;
  }
  if (hasIdentity(row)) {
    score += 10;
  }
  if (row.images.length >= 3) {
    score += 14;
  } else if (row.images.length >= 2) {
    score += 10;
  } else if (row.images.length >= 1) {
    score += 4;
  }
  if (row.provider === "liteapi") {
    score += 22;
  } else if (row.provider === "google_places") {
    score += 8;
  }
  if (hasBookableSignal(row)) {
    score += 12;
  }
  if (
    row.photoConfidence === "exact_place_id" ||
    row.photoConfidence === "strong_identity"
  ) {
    score += 12;
  } else if (row.photoConfidence === "nearby_identity") {
    score += 4;
  } else if (row.photoConfidence === "mock") {
    score -= 10;
  }
  if (row.liteapiHotelId?.trim()) {
    score += 6;
  }
  if (row.roomOffers && row.roomOffers.length > 0) {
    score += 6;
  }
  return Math.min(100, Math.max(0, Math.round(score)));
}

/** Hard gate for one lodging row. */
export function verifyLodgingCandidate(input: {
  row: ContextLodgingInventoryRow;
  mode?: LodgingVerificationMode | null;
}): LodgingVerificationResult {
  const mode = input.mode ?? "strict";
  if (mode === "off") {
    return {
      ok: true,
      score100: computeLodgingVerificationScore(input.row),
      failReasons: [],
    };
  }

  const failReasons: LodgingVerificationFailReason[] = [];
  if (!hasFiniteCoords(input.row)) {
    failReasons.push("coords");
  }
  if (!hasIdentity(input.row)) {
    failReasons.push("identity");
  }
  if (!imageCountOk(input.row, mode)) {
    failReasons.push("images");
  }
  if (mode === "strict" && !hasBookableSignal(input.row)) {
    failReasons.push("bookable");
  }
  if (!photoConfidenceOk(input.row, mode)) {
    failReasons.push("photo_confidence");
  }

  return {
    ok: failReasons.length === 0,
    score100: computeLodgingVerificationScore(input.row),
    failReasons,
  };
}

export type FilterVerifiedLodgingRowsResult = {
  readonly kept: ContextLodgingInventoryRow[];
  readonly removed: ContextLodgingInventoryRow[];
  /** Applied after optional strict→relaxed fallback. */
  readonly modeApplied: LodgingVerificationMode;
  /** True when hard gate emptied the pool and we fell back to the original rows. */
  readonly usedRawFallback: boolean;
};

/**
 * Filter inventory to verified lodging.
 * Never returns empty when input was non-empty — falls back relaxed, then raw.
 */
export function filterVerifiedLodgingRows(input: {
  rows: readonly ContextLodgingInventoryRow[];
  mode?: LodgingVerificationMode | null;
}): FilterVerifiedLodgingRowsResult {
  const requested = input.mode ?? "strict";
  if (requested === "off" || input.rows.length === 0) {
    return {
      kept: [...input.rows],
      removed: [],
      modeApplied: requested,
      usedRawFallback: false,
    };
  }

  const strictKept = input.rows.filter(
    (row) => verifyLodgingCandidate({ row, mode: requested }).ok,
  );
  if (strictKept.length > 0) {
    return {
      kept: strictKept,
      removed: input.rows.filter((row) => !strictKept.includes(row)),
      modeApplied: requested,
      usedRawFallback: false,
    };
  }

  if (requested === "strict") {
    const relaxedKept = input.rows.filter(
      (row) => verifyLodgingCandidate({ row, mode: "relaxed" }).ok,
    );
    if (relaxedKept.length > 0) {
      return {
        kept: relaxedKept,
        removed: input.rows.filter((row) => !relaxedKept.includes(row)),
        modeApplied: "relaxed",
        usedRawFallback: false,
      };
    }
  }

  // Last resort: keep raw so scout still surfaces something.
  return {
    kept: [...input.rows],
    removed: [],
    modeApplied: requested,
    usedRawFallback: true,
  };
}

export function lodgingVerificationModeFromExploration(
  mode: "convergent" | "diffuse" | null | undefined,
): LodgingVerificationMode {
  if (mode === "diffuse") {
    return "relaxed";
  }
  return "strict";
}
