/**
 * Default discovery supply gate — thin review stacks (e.g. 3 reviews @ 5.0)
 * are not trustworthy for MAIN ranking. Google exposes user_ratings_total;
 * unknown counts are allowed only for non-Google sources (Naver / mock / LiteAPI).
 */

export const DEFAULT_MIN_PLACE_REVIEW_COUNT = 50;

export function passesMinReviewCountGate(input: {
  reviewCount?: number | null;
  /** Provider id / sourceLabel hint — google* must have counts. */
  source?: string | null;
  minCount?: number;
  /**
   * Rank-layer mode: only drop known thin stacks.
   * Upstream Google inventory already requires counts; mocks may omit the field.
   */
  knownOnly?: boolean;
}): boolean {
  const min = input.minCount ?? DEFAULT_MIN_PLACE_REVIEW_COUNT;
  const count = input.reviewCount;
  if (typeof count === "number" && Number.isFinite(count)) {
    return count >= min;
  }
  if (input.knownOnly) {
    return true;
  }
  const source = (input.source ?? "").toLowerCase();
  if (
    source.includes("google") ||
    source === "google_places" ||
    source === "google_places_nearby" ||
    source === "google_places_details"
  ) {
    return false;
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
