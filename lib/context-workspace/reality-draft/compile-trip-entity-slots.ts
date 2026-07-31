/**
 * Intent Plan → Day/Entity slots → TripDraftStop (Reality Draft compiler).
 * Destination seed providers fill slots; Osaka is one provider, not the control flow.
 */

import type { IntentPlanEntity } from "@/lib/intent-router/build-intent-plan";
import type { TripDraftStop } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
import { OSAKA_TRIP_DRAFT_STOPS } from "@/lib/context-workspace/reality-draft/trip-draft-stops";
import { looksLikeOsakaContext } from "@/lib/search-engine/osaka-demo-catalog";

export type TripEntitySlotKind =
  | "flight"
  | "lodging"
  | "itinerary"
  | "eatery"
  | "poi";

export type TripEntitySlot = {
  readonly slotId: string;
  readonly day: number;
  readonly entityKind: TripEntitySlotKind;
  readonly labelKo: string;
  readonly roleTags: readonly string[];
  readonly fillStatus: "empty" | "seeded";
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

/**
 * Compile Day × Entity slots from Intent Plan shape (deterministic).
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

  const slots: TripEntitySlot[] = [];

  if (wantFlight) {
    slots.push({
      slotId: `slot:${dest}:d1:flight`,
      day: 1,
      entityKind: "flight",
      labelKo: `${dest} 도착`,
      roleTags: ["day_1", "airport", "arrival", "flight"],
      fillStatus: "empty",
    });
  }
  if (wantLodging) {
    slots.push({
      slotId: `slot:${dest}:d1:lodging`,
      day: 1,
      entityKind: "lodging",
      labelKo: `${dest} 숙소`,
      roleTags: ["day_1", "lodging", "stay", "reservable"],
      fillStatus: "empty",
    });
  }

  if (wantItinerary) {
    for (let d = 1; d <= dayCount; d += 1) {
      // Day1 already has arrival/stay — add experience from day 2, or day1 evening if short trip
      if (d === 1 && dayCount > 1) continue;
      slots.push({
        slotId: `slot:${dest}:d${d}:itinerary`,
        day: d,
        entityKind: "itinerary",
        labelKo: `${dest} ${d}일차`,
        roleTags: [`day_${d}`, "experience", "poi"],
        fillStatus: "empty",
      });
    }
    if (dayCount === 1) {
      slots.push({
        slotId: `slot:${dest}:d1:itinerary`,
        day: 1,
        entityKind: "itinerary",
        labelKo: `${dest} 일정`,
        roleTags: ["day_1", "experience", "poi"],
        fillStatus: "empty",
      });
    }
  }

  if (wantFood) {
    const foodDay = Math.max(1, Math.min(dayCount, 2));
    slots.push({
      slotId: `slot:${dest}:d${foodDay}:eatery`,
      day: foodDay,
      entityKind: "eatery",
      labelKo: `${dest} 맛집`,
      roleTags: [`day_${foodDay}`, "food", "reservable"],
      fillStatus: "empty",
    });
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

/** Map Osaka catalog onto day slots (seed provider). */
export function seedOsakaStopsForDays(dayCount: number): TripDraftStop[] {
  const experienceDay = Math.min(3, Math.max(2, dayCount));
  const foodDay = Math.min(dayCount, Math.max(2, Math.floor(dayCount / 2) || 2));
  const out: TripDraftStop[] = [];

  for (const stop of OSAKA_TRIP_DRAFT_STOPS) {
    if (stop.tags.includes("airport") || stop.tags.includes("arrival")) {
      out.push(withDayTag(stop, 1));
      continue;
    }
    if (stop.kind === "lodging") {
      out.push(withDayTag(stop, 1));
      continue;
    }
    if (/usj|theme_park/iu.test(stop.tags.join(" "))) {
      out.push(withDayTag(stop, experienceDay, ["experience"]));
      continue;
    }
    if (stop.kind === "eatery" || stop.tags.includes("food")) {
      out.push(withDayTag(stop, foodDay));
      continue;
    }
    // Remaining POIs → day 2 (or day1 if 1-day)
    const day = dayCount <= 1 ? 1 : Math.min(2, dayCount);
    out.push(withDayTag(stop, day));
  }
  return out;
}

function skeletonStopFromSlot(
  slot: TripEntitySlot,
  dest: string,
  anchor: { lat: number; lng: number },
  index: number,
): TripDraftStop {
  const jitter = (index + 1) * 0.008;
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
    lat: anchor.lat + (index % 2 === 0 ? jitter : -jitter * 0.6),
    lng: anchor.lng + (index % 3 === 0 ? jitter * 0.8 : -jitter * 0.4),
    amountLabel: kind === "lodging" ? "가격 미정" : null,
    walkMinutes: index === 0 ? 0 : 12 + index * 3,
    tags: [...slot.roleTags, "skeleton", "ready_slot"],
    rating: 4.2,
    indoor: kind === "lodging" || kind === "eatery",
  };
}

/**
 * Materialize stops: Osaka seed when context matches, else Intent-slot skeletons.
 */
export function materializeTripDraftStops(input: {
  readonly destinationKo: string;
  readonly utterance?: string | null;
  readonly slots: readonly TripEntitySlot[];
  readonly dayCount: number;
}): {
  readonly stops: readonly TripDraftStop[];
  readonly seededFrom: "osaka_catalog" | "intent_slots";
} {
  const dest = input.destinationKo.trim() || "여행지";
  const query = `${dest} ${input.utterance ?? ""}`;
  if (looksLikeOsakaContext({ query })) {
    return {
      stops: seedOsakaStopsForDays(input.dayCount),
      seededFrom: "osaka_catalog",
    };
  }

  const anchor = resolveDestinationAnchor(dest);
  const stops = input.slots.map((slot, i) =>
    skeletonStopFromSlot(slot, dest, anchor, i),
  );
  return { stops, seededFrom: "intent_slots" };
}
