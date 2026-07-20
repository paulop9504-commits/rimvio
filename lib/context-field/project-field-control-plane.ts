/**
 * Context Field Control Plane — one pack projected to graph / search / recommend / booking.
 * Engines stay split; this is the merge seam (Cursor-style control surface).
 */

import type { DiscoveryFieldPatch } from "@/lib/context-field/apply-fields-to-discovery-spec";
import { applyFieldsToDiscoverySpec } from "@/lib/context-field/apply-fields-to-discovery-spec";
import { applyFieldsToGraphFilter } from "@/lib/context-field/apply-fields-to-graph-filter";
import { mapContextCompanionToTravelMode } from "@/lib/context-field/map-companion-to-travel";
import type { ContextCompanion, ContextFieldPack } from "@/lib/context-field/types";
import type { GraphFilterPredicate } from "@/lib/graph-command/types";
import type { EateryRankContextHints } from "@/lib/globe/eatery/eatery-rank-profile";
import type { LodgingRankContextHints } from "@/lib/globe/lodging/lodging-rank-profile";
import type {
  TravelBudgetBand,
  TravelFoodBias,
} from "@/lib/situation-projection/travel-brain-personalization";

export type ContextFieldSearchControl = {
  /** Extra query tokens appended for inventory / maps text search. */
  readonly querySuffixes: readonly string[];
  readonly preferLocalFavorite: boolean;
  readonly maxWalkMinutes: number | null;
  /** Soft price band ceiling (1–3 seed scale); null = no filter. */
  readonly maxPriceBand: number | null;
  readonly radiusMHint: number | null;
};

export type ContextFieldBookingControl = {
  readonly maxPriceKrw: number | null;
  readonly companion: ContextCompanion | null;
  readonly preferReservable: boolean;
  readonly weather: "rain" | null;
  readonly crowd: "no_wait" | null;
  readonly timeScope: "today" | null;
};

export type ContextFieldControlPlane = {
  readonly version: 1;
  readonly pack: ContextFieldPack;
  readonly discovery: DiscoveryFieldPatch;
  readonly graphFilter: GraphFilterPredicate | null;
  readonly search: ContextFieldSearchControl;
  readonly eateryRankHints: EateryRankContextHints;
  readonly lodgingRankHints: LodgingRankContextHints;
  readonly booking: ContextFieldBookingControl;
};

function radiusHintFromPack(pack: ContextFieldPack): number | null {
  if (pack.distance?.maxWalkMinutes != null) {
    // ~80m / minute walking heuristic, clamped.
    return Math.min(
      2500,
      Math.max(400, Math.round(pack.distance.maxWalkMinutes * 80)),
    );
  }
  if (pack.transport?.value === "walk" || pack.location?.nearHotel) {
    return 800;
  }
  if (pack.transport?.value === "transit") {
    return 1200;
  }
  if (pack.transport?.value === "car") {
    return 2000;
  }
  return null;
}

function buildQuerySuffixes(pack: ContextFieldPack): string[] {
  const suffixes: string[] = [];
  if (pack.category?.label) {
    suffixes.push(pack.category.label);
  }
  if (pack.popularity?.localFavoriteOnly || pack.popularity?.vibe === "local") {
    suffixes.push("현지");
  }
  if (pack.mood?.vibe === "quiet" || pack.crowd?.value === "no_wait") {
    suffixes.push("조용한");
  }
  if (pack.weather?.value === "rain") {
    suffixes.push("실내");
  }
  if (pack.companion?.value === "solo") {
    suffixes.push("혼자");
  } else if (pack.companion?.value === "date") {
    suffixes.push("데이트");
  } else if (pack.companion?.value === "family") {
    suffixes.push("가족");
  }
  if (pack.location?.nearHotel) {
    suffixes.push("호텔 근처");
  }
  if (pack.location?.areaHint) {
    suffixes.push(pack.location.areaHint);
  }
  return [...new Set(suffixes.filter((s) => s.trim().length > 0))];
}

function foodBiasFromPack(pack: ContextFieldPack): TravelFoodBias | null {
  if (pack.popularity?.localFavoriteOnly || pack.popularity?.vibe === "local") {
    return "local";
  }
  if (pack.budget?.softBudget === "low" || pack.price?.maxKrw != null) {
    return "value";
  }
  if (pack.popularity?.vibe === "hot" || pack.popularity?.vibe === "popular") {
    return "landmark";
  }
  return null;
}

function budgetBandFromPack(pack: ContextFieldPack): TravelBudgetBand | null {
  if (pack.price?.maxKrw != null || pack.budget?.softBudget === "low") {
    return "value";
  }
  if (pack.budget?.softBudget === "high") {
    return "premium";
  }
  if (pack.budget?.softBudget === "medium") {
    return "balanced";
  }
  return null;
}

function maxPriceBandFromPack(pack: ContextFieldPack): number | null {
  if (pack.price?.maxKrw != null) {
    if (pack.price.maxKrw <= 25_000) {
      return 1;
    }
    if (pack.price.maxKrw <= 60_000) {
      return 2;
    }
    return 3;
  }
  if (pack.budget?.softBudget === "low") {
    return 1;
  }
  if (pack.budget?.softBudget === "high") {
    return 3;
  }
  return null;
}

/** Project a compiled FieldPack onto every downstream control surface. */
export function projectFieldControlPlane(
  pack: ContextFieldPack,
): ContextFieldControlPlane {
  const discovery = applyFieldsToDiscoverySpec({ pack, previous: null });
  const graphFilter = applyFieldsToGraphFilter(pack);
  const companionMode = mapContextCompanionToTravelMode(pack.companion?.value);
  const foodBias = foodBiasFromPack(pack);
  const budgetBand = budgetBandFromPack(pack);

  const eateryRankHints: EateryRankContextHints = {
    ...(foodBias ? { foodBias } : {}),
    ...(budgetBand ? { budgetBand } : {}),
    ...(companionMode ? { companionMode } : {}),
  };

  const lodgingRankHints: LodgingRankContextHints = {
    ...(budgetBand ? { budgetBand } : {}),
    ...(companionMode ? { companionMode } : {}),
  };

  return {
    version: 1,
    pack,
    discovery,
    graphFilter,
    search: {
      querySuffixes: buildQuerySuffixes(pack),
      preferLocalFavorite: Boolean(
        pack.popularity?.localFavoriteOnly || pack.popularity?.vibe === "local",
      ),
      maxWalkMinutes: pack.distance?.maxWalkMinutes ?? null,
      maxPriceBand: maxPriceBandFromPack(pack),
      radiusMHint: radiusHintFromPack(pack),
    },
    eateryRankHints,
    lodgingRankHints,
    booking: {
      maxPriceKrw: pack.price?.maxKrw ?? null,
      companion: pack.companion?.value ?? null,
      preferReservable: pack.crowd?.value === "no_wait",
      weather: pack.weather?.value ?? null,
      crowd: pack.crowd?.value ?? null,
      timeScope: pack.time?.value ?? null,
    },
  };
}

/** Append search control suffixes onto a base maps/inventory query. */
export function composeSearchQueryWithFieldControl(
  baseQuery: string,
  search: ContextFieldSearchControl,
): string {
  const base = baseQuery.trim();
  const extra = search.querySuffixes.filter(
    (suffix) => suffix && !base.includes(suffix),
  );
  if (extra.length === 0) {
    return base;
  }
  return `${base} ${extra.join(" ")}`.trim();
}

/** Filter + sort place hits under field search control (deterministic). */
export function applyFieldControlToPlaceHits<
  T extends {
    localFavorite?: boolean | null;
    walkMinutes?: number | null;
    priceBand?: number | null;
    reservable?: boolean | null;
    rating?: number | null;
  },
>(hits: readonly T[], search: ContextFieldSearchControl): T[] {
  let next = [...hits];
  if (search.maxWalkMinutes != null) {
    next = next.filter(
      (hit) =>
        hit.walkMinutes == null || hit.walkMinutes <= search.maxWalkMinutes!,
    );
  }
  if (search.maxPriceBand != null) {
    next = next.filter(
      (hit) =>
        hit.priceBand == null || hit.priceBand <= search.maxPriceBand!,
    );
  }
  next.sort((a, b) => {
    if (search.preferLocalFavorite) {
      const local =
        Number(Boolean(b.localFavorite)) - Number(Boolean(a.localFavorite));
      if (local !== 0) {
        return local;
      }
    }
    if (search.maxWalkMinutes != null || search.preferLocalFavorite) {
      const walk = (a.walkMinutes ?? 99) - (b.walkMinutes ?? 99);
      if (walk !== 0) {
        return walk;
      }
    }
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
  return next;
}

/** Flatten booking control into tool meta (string | number | boolean | null). */
export function bookingControlToToolMeta(
  booking: ContextFieldBookingControl,
): Record<string, string | number | boolean | null> {
  return {
    maxPriceKrw: booking.maxPriceKrw,
    companion: booking.companion,
    preferReservable: booking.preferReservable,
    weather: booking.weather,
    crowd: booking.crowd,
    timeScope: booking.timeScope,
  };
}
