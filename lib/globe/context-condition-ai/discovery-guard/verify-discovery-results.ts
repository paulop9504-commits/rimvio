/**
 * Discovery Category Integrity Guard — result verifier.
 *
 * After retrieval, keep only rows whose true category is consistent with the
 * requested domain. Not a binary drop: each row gets a 0..1 relevance score for
 * the domain, and we keep rows at/above a per-domain threshold. High-involvement
 * domains (lodging/activity/amenity) are strict — searching "숙소" must never
 * surface a restaurant. Low-involvement domains (eatery) stay flexible so an
 * adjacent dessert spot enriches, not pollutes, the results.
 */
import {
  classifyPlaceCategory,
  type PlaceCategory,
} from "@/lib/globe/context-condition-ai/discovery-guard/classify-place-category";

export type DiscoveryGuardDomain = "lodging" | "eatery" | "activity" | "amenity";

/** Per-domain minimum category-consistency score to keep a row. */
export const DISCOVERY_GUARD_THRESHOLD: Record<DiscoveryGuardDomain, number> = {
  lodging: 0.9,
  activity: 0.85,
  amenity: 0.85,
  eatery: 0.5,
};

type GuardRow = {
  readonly name: string;
  readonly categoryLabel?: string | null;
  readonly cuisineHint?: string | null;
  readonly address?: string | null;
};

/** Category-consistency score of a row for a requested domain (0 = wrong). */
function categoryScore(
  domain: DiscoveryGuardDomain,
  category: PlaceCategory,
): number {
  switch (domain) {
    case "lodging":
      if (category === "lodging") return 1;
      if (category === "unknown") return 0.3;
      return 0.1;
    case "amenity":
      if (category === "amenity") return 1;
      // Contradictory leisure/food/stay categories are hard-wrong for an errand.
      if (
        category === "cafe" ||
        category === "restaurant" ||
        category === "lodging" ||
        category === "theme_park"
      ) {
        return 0;
      }
      if (category === "unknown") return 0.4;
      return 0.3;
    case "activity":
      // A cafe/restaurant/hotel for "놀거리" is the exact bug — hard-reject.
      if (
        category === "cafe" ||
        category === "restaurant" ||
        category === "lodging"
      ) {
        return 0;
      }
      if (
        category === "attraction" ||
        category === "theme_park" ||
        category === "park" ||
        category === "museum" ||
        category === "shopping"
      ) {
        return 1;
      }
      if (category === "amenity") return 0.3;
      return 0.4; // unknown — rescued only by a focus/name match below
    case "eatery":
      if (category === "restaurant" || category === "cafe") return 1;
      // Adjacent categories enrich a food search rather than break it.
      if (category === "shopping" || category === "attraction") return 0.6;
      if (category === "museum" || category === "park") return 0.4;
      if (category === "amenity") return 0.3;
      if (category === "lodging") return 0.2;
      return 0.6; // unknown — flexible, keep by default
  }
}

function matchesFocus(row: GuardRow, focusTokens: readonly string[]): boolean {
  if (focusTokens.length === 0) {
    return false;
  }
  const blob = [row.name, row.categoryLabel, row.cuisineHint, row.address]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return focusTokens.some((token) => blob.includes(token));
}

export type DiscoveryGuardResult<T> = {
  readonly kept: T[];
  readonly removed: T[];
  /** True when the guard removed every input row (caller should not pin junk). */
  readonly emptiedByGuard: boolean;
};

/**
 * Filter scored discovery rows by category consistency with the requested domain.
 * A row that literally matches the focus (e.g. name contains "유니버설") is trusted
 * even when its provider category is unknown — but an explicitly contradictory
 * category (a cafe for an activity search) is never rescued.
 */
export function verifyDiscoveryResults<T extends { readonly row: GuardRow }>(input: {
  domain: DiscoveryGuardDomain;
  items: readonly T[];
  focusTokens?: readonly string[];
}): DiscoveryGuardResult<T> {
  const focusTokens = (input.focusTokens ?? [])
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length >= 2);
  const threshold = DISCOVERY_GUARD_THRESHOLD[input.domain];

  const kept: T[] = [];
  const removed: T[] = [];

  for (const item of input.items) {
    const category = classifyPlaceCategory(item.row);
    const base = categoryScore(input.domain, category);
    // A hard-wrong category (0) means the row contradicts the domain — a focus
    // token match cannot rescue a hotel from an activity search.
    const score =
      base > 0 && matchesFocus(item.row, focusTokens) ? Math.max(base, 0.9) : base;
    if (score >= threshold) {
      kept.push(item);
    } else {
      removed.push(item);
    }
  }

  return {
    kept,
    removed,
    emptiedByGuard: input.items.length > 0 && kept.length === 0,
  };
}
