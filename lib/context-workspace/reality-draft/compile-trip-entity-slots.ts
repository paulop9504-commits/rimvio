/**
 * Intent Plan → Day × dayPart slots → TripDraftStop (Reality Draft compiler).
 * L1: morning / lunch / afternoon / dinner (+ arrival / stay).
 * Live fill: burstFillTripInventory; Osaka catalog = fallback seed only.
 */

import type { IntentPlanEntity } from "@/lib/intent-router/build-intent-plan";
import type { TripDraftStop } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
import { OSAKA_TRIP_DRAFT_STOPS } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
import { looksLikeOsakaContext } from "@/lib/search-engine/osaka-demo-catalog";
import type { PlaceSearchHit } from "@/lib/search-engine/run-place-search";
import {
  clusterForDay,
  planTripDayClusters,
  type TripDayCluster,
} from "@/lib/context-workspace/reality-draft/trip-day-clusters";

export type TripEntitySlotKind =
  | "flight"
  | "lodging"
  | "itinerary"
  | "eatery"
  | "poi";

/** Day-part spine for itinerary burst (L1). */
export type TripDayPart =
  | "arrival"
  | "stay"
  | "morning"
  | "lunch"
  | "afternoon"
  | "dinner";

export type TripEntitySlot = {
  readonly slotId: string;
  readonly day: number;
  readonly entityKind: TripEntitySlotKind;
  readonly dayPart: TripDayPart;
  readonly clusterId: string;
  readonly labelKo: string;
  readonly roleTags: readonly string[];
  readonly fillStatus: "empty" | "seeded" | "live";
};

const DEST_ANCHORS: Readonly<
  Record<string, { readonly lat: number; readonly lng: number }>
> = {
  오사카: { lat: 34.6937, lng: 135.5023 },
  大阪: { lat: 34.6937, lng: 135.5023 },
  osaka: { lat: 34.6937, lng: 135.5023 },
  제주: { lat: 33.4996, lng: 126.5312 },
  도쿄: { lat: 35.6812, lng: 139.7671 },
  東京: { lat: 35.6812, lng: 139.7671 },
  후쿠오카: { lat: 33.5902, lng: 130.4017 },
  부산: { lat: 35.1796, lng: 129.0756 },
  서울: { lat: 37.5665, lng: 126.978 },
  교토: { lat: 35.0116, lng: 135.7681 },
};

/** Travel Workspace default hub — never silent Seoul. */
const DEFAULT_TRAVEL_ANCHOR = DEST_ANCHORS.오사카;

export function resolveDestinationAnchor(destinationKo: string): {
  readonly lat: number;
  readonly lng: number;
} {
  const key = destinationKo.trim().toLowerCase();
  if (!key) {
    return DEFAULT_TRAVEL_ANCHOR;
  }
  for (const [name, anchor] of Object.entries(DEST_ANCHORS)) {
    if (key.includes(name.toLowerCase()) || destinationKo.includes(name)) {
      return anchor;
    }
  }
  return DEFAULT_TRAVEL_ANCHOR;
}

export function resolveTripDayCount(input: {
  readonly days?: number | null;
  readonly nights?: number | null;
  readonly stayLabelKo?: string | null;
}): number {
  if (input.days != null && input.days > 0) {
    return Math.min(14, Math.max(1, Math.floor(input.days)));
  }
  if (input.nights != null && input.nights >= 0) {
    return Math.min(14, Math.max(1, Math.floor(input.nights) + 1));
  }
  const stay = input.stayLabelKo?.trim() ?? "";
  const m = /(\d+)\s*박\s*(\d+)\s*일/u.exec(stay);
  if (m) return Math.min(14, Math.max(1, Number(m[2])));
  const n = /(\d+)\s*박/u.exec(stay);
  if (n) return Math.min(14, Math.max(1, Number(n[1]) + 1));
  return 3;
}

function defaultTravelEntities(): readonly IntentPlanEntity[] {
  return [
    { id: "flight", kind: "flight", labelKo: "항공", emoji: "✈" },
    { id: "lodging", kind: "lodging", labelKo: "숙소", emoji: "🏨" },
    { id: "itinerary", kind: "itinerary", labelKo: "일정", emoji: "🎢" },
    { id: "eatery", kind: "eatery", labelKo: "맛집", emoji: "🍣" },
  ];
}

const DAY_PART_ORDER: readonly TripDayPart[] = [
  "arrival",
  "stay",
  "morning",
  "lunch",
  "afternoon",
  "dinner",
];

export function compareTripDayParts(a: TripDayPart, b: TripDayPart): number {
  return DAY_PART_ORDER.indexOf(a) - DAY_PART_ORDER.indexOf(b);
}

function dayPartsForDay(input: {
  readonly day: number;
  readonly dayCount: number;
  readonly wantItinerary: boolean;
  readonly wantFood: boolean;
}): readonly TripDayPart[] {
  const { day, dayCount, wantItinerary, wantFood } = input;
  if (dayCount === 1) {
    const parts: TripDayPart[] = [];
    if (wantItinerary) parts.push("morning", "afternoon");
    if (wantFood) parts.push("lunch", "dinner");
    return parts;
  }
  if (day === 1) {
    // Arrival evening — light day
    return wantFood ? (["dinner"] as const) : [];
  }
  if (day === dayCount) {
    // Departure — morning + lunch
    const parts: TripDayPart[] = [];
    if (wantItinerary) parts.push("morning");
    if (wantFood) parts.push("lunch");
    return parts;
  }
  const parts: TripDayPart[] = [];
  if (wantItinerary) parts.push("morning", "afternoon");
  if (wantFood) parts.push("lunch", "dinner");
  return parts;
}

function entityKindForDayPart(part: TripDayPart): TripEntitySlotKind {
  if (part === "lunch" || part === "dinner") return "eatery";
  return "itinerary";
}

function labelForDayPart(
  dest: string,
  day: number,
  part: TripDayPart,
  cluster: TripDayCluster,
): string {
  switch (part) {
    case "arrival":
      return `${dest} 도착`;
    case "stay":
      return `${dest} 숙소`;
    case "morning":
      return `${day}일차 오전 · ${cluster.labelKo}`;
    case "lunch":
      return `${day}일차 점심 · ${cluster.labelKo}`;
    case "afternoon":
      return `${day}일차 오후 · ${cluster.labelKo}`;
    case "dinner":
      return `${day}일차 저녁 · ${cluster.labelKo}`;
  }
}

/**
 * Compile Day × dayPart slots from Intent Plan shape (deterministic L1).
 */
export function compileTripEntitySlots(input: {
  readonly destinationKo: string;
  readonly stayLabelKo?: string | null;
  readonly days?: number | null;
  readonly nights?: number | null;
  readonly expectedEntities?: readonly IntentPlanEntity[] | null;
}): readonly TripEntitySlot[] {
  const dest = input.destinationKo.trim() || "여행지";
  const dayCount = resolveTripDayCount(input);
  const entities =
    input.expectedEntities && input.expectedEntities.length > 0
      ? input.expectedEntities
      : defaultTravelEntities();

  const wantFlight = entities.some((e) => e.kind === "flight");
  const wantLodging = entities.some((e) => e.kind === "lodging");
  const wantItinerary = entities.some(
    (e) => e.kind === "itinerary" || e.kind === "poi",
  );
  const wantFood = entities.some((e) => e.kind === "eatery");

  const clusters = planTripDayClusters(dest, dayCount);
  const slots: TripEntitySlot[] = [];

  for (let day = 1; day <= dayCount; day += 1) {
    const cluster = clusterForDay(clusters, day);

    if (day === 1 && wantFlight) {
      slots.push({
        slotId: `slot:${dest}:d1:arrival`,
        day: 1,
        entityKind: "flight",
        dayPart: "arrival",
        clusterId: cluster.id,
        labelKo: labelForDayPart(dest, 1, "arrival", cluster),
        roleTags: ["day_1", "airport", "arrival", "flight", "part_arrival"],
        fillStatus: "empty",
      });
    }
    if (day === 1 && wantLodging) {
      slots.push({
        slotId: `slot:${dest}:d1:stay`,
        day: 1,
        entityKind: "lodging",
        dayPart: "stay",
        clusterId: cluster.id,
        labelKo: labelForDayPart(dest, 1, "stay", cluster),
        roleTags: ["day_1", "lodging", "stay", "reservable", "part_stay"],
        fillStatus: "empty",
      });
    }

    for (const part of dayPartsForDay({
      day,
      dayCount,
      wantItinerary,
      wantFood,
    })) {
      const entityKind = entityKindForDayPart(part);
      slots.push({
        slotId: `slot:${dest}:d${day}:${part}`,
        day,
        entityKind,
        dayPart: part,
        clusterId: cluster.id,
        labelKo: labelForDayPart(dest, day, part, cluster),
        roleTags: [
          `day_${day}`,
          `part_${part}`,
          `cluster_${cluster.id}`,
          entityKind === "eatery" ? "food" : "experience",
          entityKind === "eatery" ? "reservable" : "poi",
        ],
        fillStatus: "empty",
      });
    }
  }

  return slots;
}

function withDayTag(
  stop: TripDraftStop,
  day: number,
  extra: readonly string[] = [],
): TripDraftStop {
  const dayTag = `day_${day}`;
  const tags = [
    ...stop.tags.filter((t) => !/^day[_-]?\d+$/iu.test(t)),
    dayTag,
    ...extra,
  ];
  return { ...stop, tags };
}

/** Map Osaka catalog onto day slots (fallback seed provider only). */
export function seedOsakaStopsForDays(dayCount: number): TripDraftStop[] {
  const experienceDay = Math.min(3, Math.max(2, dayCount));
  const foodDay = Math.min(dayCount, Math.max(2, Math.floor(dayCount / 2) || 2));
  const out: TripDraftStop[] = [];

  for (const stop of OSAKA_TRIP_DRAFT_STOPS) {
    if (stop.tags.includes("airport") || stop.tags.includes("arrival")) {
      out.push(withDayTag(stop, 1, ["part_arrival", "fallback_seed"]));
      continue;
    }
    if (stop.kind === "lodging") {
      out.push(withDayTag(stop, 1, ["part_stay", "fallback_seed"]));
      continue;
    }
    if (/usj|theme_park/iu.test(stop.tags.join(" "))) {
      out.push(
        withDayTag(stop, experienceDay, [
          "experience",
          "part_morning",
          "fallback_seed",
        ]),
      );
      continue;
    }
    if (stop.kind === "eatery" || stop.tags.includes("food")) {
      out.push(withDayTag(stop, foodDay, ["part_dinner", "fallback_seed"]));
      continue;
    }
    const day = dayCount <= 1 ? 1 : Math.min(2, dayCount);
    out.push(withDayTag(stop, day, ["part_afternoon", "fallback_seed"]));
  }
  return out;
}

function skeletonStopFromSlot(
  slot: TripEntitySlot,
  dest: string,
  cluster: TripDayCluster,
  index: number,
): TripDraftStop {
  const jitter = (index + 1) * 0.006;
  const kind =
    slot.entityKind === "flight"
      ? ("amenity" as const)
      : slot.entityKind === "lodging"
        ? ("lodging" as const)
        : slot.entityKind === "eatery"
          ? ("eatery" as const)
          : ("poi" as const);

  return {
    id: slot.slotId,
    kind,
    title: slot.labelKo,
    lat: cluster.lat + (index % 2 === 0 ? jitter : -jitter * 0.6),
    lng: cluster.lng + (index % 3 === 0 ? jitter * 0.8 : -jitter * 0.4),
    amountLabel: kind === "lodging" ? "가격 미정" : null,
    walkMinutes: index === 0 ? 0 : 10 + index * 2,
    tags: [...slot.roleTags, "skeleton", "ready_slot"],
    rating: 4.2,
    indoor: kind === "lodging" || kind === "eatery",
  };
}

function hitToStop(
  hit: PlaceSearchHit,
  slot: TripEntitySlot,
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
      `source_${hit.source}`,
      hit.localFavorite ? "local_favorite" : "",
      hit.reservable ? "reservable" : "",
    ].filter(Boolean),
    rating: hit.rating ?? 4.2,
    indoor: kind === "lodging" || kind === "eatery",
  };
}

function osakaFallbackStopForSlot(slot: TripEntitySlot): TripDraftStop | null {
  const catalog = OSAKA_TRIP_DRAFT_STOPS;
  if (slot.dayPart === "arrival") {
    const airport = catalog.find(
      (s) => s.tags.includes("airport") || s.tags.includes("arrival"),
    );
    return airport
      ? withDayTag(airport, slot.day, ["part_arrival", "fallback_seed"])
      : null;
  }
  if (slot.dayPart === "stay" || slot.entityKind === "lodging") {
    const lodging = catalog.find((s) => s.kind === "lodging");
    return lodging
      ? withDayTag(lodging, slot.day, ["part_stay", "fallback_seed"])
      : null;
  }
  if (slot.clusterId === "usj" && slot.entityKind === "itinerary") {
    const usj = catalog.find((s) => /usj|theme_park/iu.test(s.tags.join(" ")));
    return usj
      ? withDayTag(usj, slot.day, [
          `part_${slot.dayPart}`,
          "fallback_seed",
          "experience",
        ])
      : null;
  }
  if (slot.entityKind === "eatery") {
    const food =
      catalog.find((s) => s.kind === "eatery") ??
      catalog.find((s) => s.tags.includes("food"));
    return food
      ? withDayTag(food, slot.day, [`part_${slot.dayPart}`, "fallback_seed"])
      : null;
  }
  if (slot.entityKind === "itinerary" || slot.entityKind === "poi") {
    const poi = catalog.find(
      (s) =>
        s.kind === "poi" &&
        !/usj|theme_park/iu.test(s.tags.join(" ")) &&
        !s.tags.includes("airport"),
    );
    return poi
      ? withDayTag(poi, slot.day, [`part_${slot.dayPart}`, "fallback_seed"])
      : null;
  }
  return null;
}

export type TripSlotInventory = {
  readonly slotId: string;
  readonly hits: readonly PlaceSearchHit[];
  readonly picked: PlaceSearchHit | null;
};

export type MaterializeTripDraftResult = {
  readonly stops: readonly TripDraftStop[];
  readonly seededFrom: "live_burst" | "osaka_catalog" | "intent_slots";
};

/**
 * Materialize stops from burst picks; Osaka hardcode / skeleton only as gaps.
 */
export function materializeTripDraftStops(input: {
  readonly destinationKo: string;
  readonly utterance?: string | null;
  readonly slots: readonly TripEntitySlot[];
  readonly dayCount: number;
  readonly inventories?: readonly TripSlotInventory[] | null;
}): MaterializeTripDraftResult {
  const dest = input.destinationKo.trim() || "여행지";
  const query = `${dest} ${input.utterance ?? ""}`;
  const isOsaka = looksLikeOsakaContext({ query });
  const clusters = planTripDayClusters(dest, input.dayCount);
  const bySlot = new Map(
    (input.inventories ?? []).map((inv) => [inv.slotId, inv] as const),
  );

  const hasAnyPick = [...bySlot.values()].some((inv) => inv.picked != null);
  if (!hasAnyPick && isOsaka && (!input.inventories || input.inventories.length === 0)) {
    // Legacy path: no burst ran → full Osaka seed catalog.
    return {
      stops: seedOsakaStopsForDays(input.dayCount),
      seededFrom: "osaka_catalog",
    };
  }

  const usedIds = new Set<string>();
  const stops: TripDraftStop[] = [];
  let liveCount = 0;
  let fallbackCount = 0;

  const ordered = [...input.slots].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return compareTripDayParts(a.dayPart, b.dayPart);
  });

  for (let i = 0; i < ordered.length; i += 1) {
    const slot = ordered[i]!;
    const inv = bySlot.get(slot.slotId);
    const pick = inv?.picked ?? null;

    if (pick && !usedIds.has(pick.id)) {
      // USJ cluster: prefer dedicated seed when search returned off-cluster Namba POIs.
      if (
        isOsaka &&
        slot.clusterId === "usj" &&
        slot.entityKind === "itinerary" &&
        !/usj|유니버설|universal/iu.test(pick.labelKo)
      ) {
        const fb = osakaFallbackStopForSlot(slot);
        if (fb && !usedIds.has(fb.id)) {
          usedIds.add(fb.id);
          stops.push(fb);
          fallbackCount += 1;
          continue;
        }
      }
      usedIds.add(pick.id);
      stops.push(hitToStop(pick, slot));
      liveCount += 1;
      continue;
    }

    if (isOsaka) {
      const fb = osakaFallbackStopForSlot(slot);
      if (fb && !usedIds.has(fb.id)) {
        usedIds.add(fb.id);
        stops.push(fb);
        fallbackCount += 1;
        continue;
      }
    }

    const cluster = clusterForDay(clusters, slot.day);
    stops.push(skeletonStopFromSlot(slot, dest, cluster, i));
  }

  if (liveCount > 0) {
    return { stops, seededFrom: "live_burst" };
  }
  if (fallbackCount > 0 && isOsaka) {
    return { stops, seededFrom: "osaka_catalog" };
  }
  return { stops, seededFrom: "intent_slots" };
}
