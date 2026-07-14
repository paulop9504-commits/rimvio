/**
 * Default discovery supply gate — thin review stacks (e.g. 3 reviews @ 5.0)
 * are not trustworthy for MAIN ranking. Google exposes user_ratings_total;
 * when the pool would empty, soften the floor so cuisine scouts (초밥…) still return.
 */

export const DEFAULT_MIN_PLACE_REVIEW_COUNT = 50;

/** Prefer 50; if empty, relax to 20 then 8 before allowing unknown counts. */
export const REVIEW_COUNT_PROGRESSIVE_FLOORS = [50, 20, 8] as const;

export function passesMinReviewCountGate(input: {
  reviewCount?: number | null;
  /** Provider id / sourceLabel hint — google* must have counts at the hard floor. */
  source?: string | null;
  minCount?: number;
  /**
   * Rank-layer mode: only drop known thin stacks.
   * Upstream Google inventory already requires counts; mocks may omit the field.
   */
  knownOnly?: boolean;
  /** When true, unknown reviewCount passes (used on softened floors). */
  allowUnknown?: boolean;
}): boolean {
  const min = input.minCount ?? DEFAULT_MIN_PLACE_REVIEW_COUNT;
  const count = input.reviewCount;
  if (typeof count === "number" && Number.isFinite(count)) {
    return count >= min;
  }
  if (input.knownOnly || input.allowUnknown) {
    return true;
  }
  const source = (input.source ?? "").toLowerCase();
  if (
    source.includes("google") ||
    source === "google_places" ||
    source === "google_places_nearby" ||
    source === "google_places_details"
  ) {
    // Missing user_ratings_total — do not hard-wipe the pool; progressive filter
    // will prefer counted rows first, then admit unknowns at softer floors.
    return min < DEFAULT_MIN_PLACE_REVIEW_COUNT;
  }
  return true;
}

export function readGoogleUserRatingsTotal(
  value: unknown,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value);
}

/**
 * Prefer high-volume places; never return empty when softer floors still have rows.
 * Unknown counts are only admitted after counted floors yield nothing.
 */
export function filterByMinReviewCountProgressive<T>(
  rows: readonly T[],
  read: (row: T) => {
    reviewCount?: number | null;
    source?: string | null;
  },
): T[] {
  if (rows.length === 0) {
    return [];
  }
  for (const min of REVIEW_COUNT_PROGRESSIVE_FLOORS) {
    const kept = rows.filter((row) => {
      const count = read(row).reviewCount;
      if (typeof count === "number" && Number.isFinite(count)) {
        return count >= min;
      }
      return false;
    });
    if (kept.length > 0) {
      return kept;
    }
  }
  // No counted rows survived — keep unknowns, drop only ultra-thin (< 5).
  return rows.filter((row) => {
    const count = read(row).reviewCount;
    if (typeof count === "number" && Number.isFinite(count)) {
      return count >= 5;
    }
    return true;
  });
}
