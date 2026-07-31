/**
 * Post-burst refine: route leg cap + rainy indoor swap (deterministic).
 */

import type {
  TripEntitySlot,
  TripSlotInventory,
} from "@/lib/context-workspace/reality-draft/compile-trip-entity-slots";
import { compareTripDayParts } from "@/lib/context-workspace/reality-draft/compile-trip-entity-slots";
import { guideSeedIsIndoor } from "@/lib/context-workspace/reality-draft/guide-web-seed-hits";
import type { TripDraftStop } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
import { OSAKA_TRIP_DRAFT_STOPS } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { PlaceSearchHit } from "@/lib/search-engine/run-place-search";

/** Same-day consecutive stop walk/transit budget (minutes). */
export const TRIP_DRAFT_MAX_LEG_MINUTES = 40;

/** Rough urban pace — 5 km/h ≈ 12 min/km. */
export function estimateWalkMinutes(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const km = haversineKm(lat1, lng1, lat2, lng2);
  return Math.round(km * 12);
}

function dayOfStop(stop: TripDraftStop): number {
  const tag = stop.tags.find((t) => /^day_\d+$/u.test(t));
  if (!tag) return 1;
  return Number(tag.replace(/^day_/u, "")) || 1;
}

function isAirportish(stop: TripDraftStop): boolean {
  return (
    stop.tags.includes("airport") ||
    stop.tags.includes("arrival") ||
    /공항|airport|kix|nrt|icn/iu.test(stop.title)
  );
}

function isIndoorStop(stop: TripDraftStop): boolean {
  if (stop.indoor) return true;
  if (stop.tags.some((t) => /실내|indoor|rain_safe|mall/iu.test(t))) {
    return true;
  }
  if (guideSeedIsIndoor(stop.id)) return true;
  return stop.kind === "lodging" || stop.kind === "eatery";
}

function hitToStop(
  hit: PlaceSearchHit,
  slot: TripEntitySlot,
  extraTags: readonly string[],
): TripDraftStop {
  const kind =
    hit.domain === "lodging"
      ? ("lodging" as const)
      : hit.domain === "eatery"
        ? ("eatery" as const)
        : ("poi" as const);
  return {
    id: hit.id,
    kind,
    title: hit.labelKo,
    lat: hit.lat,
    lng: hit.lng,
    amountLabel: hit.amountLabel ?? null,
    walkMinutes: hit.walkMinutes ?? 12,
    tags: [
      ...slot.roleTags,
      "live_burst",
      ...extraTags,
      hit.localFavorite ? "local_favorite" : "",
    ].filter(Boolean),
    rating: hit.rating ?? 4.2,
    indoor:
      kind === "lodging" ||
      kind === "eatery" ||
      guideSeedIsIndoor(hit.id) ||
      /실내|mall|market/iu.test(hit.labelKo),
  };
}

function inventoryForStop(
  stop: TripDraftStop,
  slots: readonly TripEntitySlot[],
  inventories: readonly TripSlotInventory[],
): { slot: TripEntitySlot; inv: TripSlotInventory } | null {
  const day = dayOfStop(stop);
  const partTag = stop.tags.find((t) => t.startsWith("part_"));
  const part = partTag?.replace(/^part_/u, "") ?? null;
  const slot =
    slots.find(
      (s) =>
        s.day === day &&
        (part == null || s.dayPart === part) &&
        (s.entityKind === "itinerary" ||
          s.entityKind === "poi" ||
          s.entityKind === "eatery" ||
          (stop.kind === "lodging" && s.entityKind === "lodging")),
    ) ??
    slots.find((s) => s.day === day && s.entityKind === "itinerary");
  if (!slot) return null;
  const inv = inventories.find((i) => i.slotId === slot.slotId);
  if (!inv) return null;
  return { slot, inv };
}

/**
 * Re-pick later stop when same-day leg exceeds TRIP_DRAFT_MAX_LEG_MINUTES.
 * Skips airport arrival legs.
 */
export function refineTripDraftRoute(input: {
  readonly stops: readonly TripDraftStop[];
  readonly slots: readonly TripEntitySlot[];
  readonly inventories: readonly TripSlotInventory[];
  readonly maxLegMinutes?: number;
}): {
  readonly stops: readonly TripDraftStop[];
  readonly repairedLegs: number;
} {
  const maxLeg = input.maxLegMinutes ?? TRIP_DRAFT_MAX_LEG_MINUTES;
  const stops = [...input.stops];
  const used = new Set(stops.map((s) => s.id));
  let repairedLegs = 0;

  for (let i = 1; i < stops.length; i += 1) {
    const prev = stops[i - 1]!;
    const cur = stops[i]!;
    if (dayOfStop(prev) !== dayOfStop(cur)) continue;
    if (isAirportish(prev) || isAirportish(cur)) continue;

    const mins = estimateWalkMinutes(prev.lat, prev.lng, cur.lat, cur.lng);
    if (mins <= maxLeg) {
      stops[i] = { ...cur, walkMinutes: mins };
      continue;
    }

    const bound = inventoryForStop(cur, input.slots, input.inventories);
    if (!bound) {
      stops[i] = {
        ...cur,
        walkMinutes: mins,
        tags: [...cur.tags, "leg_over_budget"],
      };
      continue;
    }

    const alts = bound.inv.hits
      .filter((h) => !used.has(h.id))
      .map((h) => ({
        hit: h,
        mins: estimateWalkMinutes(prev.lat, prev.lng, h.lat, h.lng),
      }))
      .filter((a) => a.mins <= maxLeg)
      .sort((a, b) => a.mins - b.mins);

    const best = alts[0];
    if (!best) {
      stops[i] = {
        ...cur,
        walkMinutes: mins,
        tags: [...cur.tags, "leg_over_budget"],
      };
      continue;
    }

    used.delete(cur.id);
    used.add(best.hit.id);
    stops[i] = hitToStop(best.hit, bound.slot, [
      "route_repaired",
      `walk_${best.mins}m`,
    ]);
    repairedLegs += 1;
  }

  return { stops, repairedLegs };
}

function indoorFallbackStop(day: number): TripDraftStop | null {
  const indoor =
    OSAKA_TRIP_DRAFT_STOPS.find(
      (s) => s.indoor && s.kind === "poi" && s.tags.includes("rain_safe"),
    ) ??
    OSAKA_TRIP_DRAFT_STOPS.find((s) => s.indoor && s.kind === "poi");
  if (!indoor) return null;
  return {
    ...indoor,
    id: `${indoor.id}:rain:${day}`,
    tags: [
      ...indoor.tags.filter((t) => !/^day_/u.test(t)),
      `day_${day}`,
      "weather_indoor_swap",
      "fallback_seed",
    ],
  };
}

/**
 * When rainy, swap outdoor POI stops for indoor alts from inventory / guide / catalog.
 */
export function refineTripDraftWeatherSwap(input: {
  readonly stops: readonly TripDraftStop[];
  readonly slots: readonly TripEntitySlot[];
  readonly inventories: readonly TripSlotInventory[];
  readonly rainy: boolean;
}): {
  readonly stops: readonly TripDraftStop[];
  readonly swapped: number;
} {
  if (!input.rainy) {
    return { stops: input.stops, swapped: 0 };
  }

  const stops = [...input.stops];
  const used = new Set(stops.map((s) => s.id));
  let swapped = 0;

  for (let i = 0; i < stops.length; i += 1) {
    const cur = stops[i]!;
    if (cur.kind !== "poi" && cur.kind !== "amenity") continue;
    if (isIndoorStop(cur) || isAirportish(cur)) continue;

    const bound = inventoryForStop(cur, input.slots, input.inventories);
    const indoorAlt =
      bound?.inv.hits.find(
        (h) =>
          !used.has(h.id) &&
          (guideSeedIsIndoor(h.id) ||
            /파크스|시장|몰|museum|미술관|실내|mall|market/iu.test(h.labelKo)),
      ) ?? null;

    if (indoorAlt && bound) {
      used.delete(cur.id);
      used.add(indoorAlt.id);
      stops[i] = hitToStop(indoorAlt, bound.slot, ["weather_indoor_swap"]);
      swapped += 1;
      continue;
    }

    const fb = indoorFallbackStop(dayOfStop(cur));
    if (fb && !used.has(fb.id)) {
      used.delete(cur.id);
      used.add(fb.id);
      stops[i] = {
        ...fb,
        tags: [
          ...fb.tags,
          ...cur.tags.filter((t) => t.startsWith("part_")),
        ],
      };
      swapped += 1;
    }
  }

  return { stops, swapped };
}

export function utteranceSuggestsRain(utterance: string): boolean {
  return /비\s*오|우천|rain|shower|소나기|장마/iu.test(utterance);
}

/**
 * Full refine pipeline after materialize.
 */
export function refineTripDraftStops(input: {
  readonly stops: readonly TripDraftStop[];
  readonly slots: readonly TripEntitySlot[];
  readonly inventories: readonly TripSlotInventory[];
  readonly utterance?: string | null;
  readonly forceRainy?: boolean;
  /** Osaka trip drafts default to rain-watch stub (matches World State seed). */
  readonly destinationKo?: string | null;
}): {
  readonly stops: readonly TripDraftStop[];
  readonly repairedLegs: number;
  readonly weatherSwapped: number;
  readonly rainy: boolean;
} {
  const rainy =
    input.forceRainy === true ||
    utteranceSuggestsRain(input.utterance ?? "");

  // Sort same-day by dayPart for stable leg checks
  const ordered = [...input.stops].sort((a, b) => {
    const da = dayOfStop(a);
    const db = dayOfStop(b);
    if (da !== db) return da - db;
    const pa = a.tags.find((t) => t.startsWith("part_"))?.replace(/^part_/u, "");
    const pb = b.tags.find((t) => t.startsWith("part_"))?.replace(/^part_/u, "");
    if (pa && pb) {
      return compareTripDayParts(
        pa as Parameters<typeof compareTripDayParts>[0],
        pb as Parameters<typeof compareTripDayParts>[0],
      );
    }
    return 0;
  });

  const routed = refineTripDraftRoute({
    stops: ordered,
    slots: input.slots,
    inventories: input.inventories,
  });
  const weathered = refineTripDraftWeatherSwap({
    stops: routed.stops,
    slots: input.slots,
    inventories: input.inventories,
    rainy,
  });

  return {
    stops: weathered.stops,
    repairedLegs: routed.repairedLegs,
    weatherSwapped: weathered.swapped,
    rainy,
  };
}
