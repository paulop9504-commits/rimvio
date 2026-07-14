import type { EventCandidate } from "@/lib/events/event-candidate";
import type { TripExperienceScoutLeg } from "@/lib/globe/trip-experience/build-trip-experience-parallel-scouts";
import {
  CONTEXT_TRIP_EXPERIENCE_MAIN_LEGS_META_KEY,
  type TripExperienceMainLegPin,
  type TripExperienceMainLegsV1,
} from "@/lib/globe/trip-experience/trip-experience-main-leg-types";

function readTrimmed(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readLegPin(raw: unknown): TripExperienceMainLegPin | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const kind = row.kind;
  if (kind !== "lodging" && kind !== "eatery" && kind !== "activity") {
    return null;
  }
  const resourceId = readTrimmed(row.resourceId);
  const placeId = readTrimmed(row.placeId);
  const label = readTrimmed(row.label);
  const pinnedAtIso = readTrimmed(row.pinnedAtIso);
  if (!resourceId || !placeId || !label || !pinnedAtIso) {
    return null;
  }
  return {
    kind,
    resourceId,
    placeId,
    label,
    pinnedAtIso,
    lat: typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : null,
    lng: typeof row.lng === "number" && Number.isFinite(row.lng) ? row.lng : null,
    mapsUrl: readTrimmed(row.mapsUrl),
    previewUrl: readTrimmed(row.previewUrl),
  };
}

export function readTripExperienceMainLegs(
  event: EventCandidate | null | undefined,
): TripExperienceMainLegsV1 | null {
  if (!event) {
    return null;
  }
  const raw = event.metadata?.[CONTEXT_TRIP_EXPERIENCE_MAIN_LEGS_META_KEY];
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const primaryKind = row.primaryKind;
  if (
    primaryKind !== "lodging" &&
    primaryKind !== "eatery" &&
    primaryKind !== "activity"
  ) {
    return null;
  }
  const legsRaw = row.legs;
  if (!legsRaw || typeof legsRaw !== "object") {
    return null;
  }
  const legsRecord = legsRaw as Record<string, unknown>;
  const legs: Partial<Record<TripExperienceScoutLeg, TripExperienceMainLegPin>> = {};
  for (const leg of ["lodging", "eatery", "activity"] as const) {
    const pin = readLegPin(legsRecord[leg]);
    if (pin) {
      legs[leg] = pin;
    }
  }
  if (Object.keys(legs).length === 0) {
    return null;
  }
  return {
    version: 1,
    primaryKind,
    legs,
  };
}

export function readTripExperienceMainLegPlaceIds(
  event: EventCandidate | null | undefined,
): {
  lodging: string | null;
  eatery: string | null;
  activity: string | null;
} {
  const mains = readTripExperienceMainLegs(event);
  if (!mains) {
    return { lodging: null, eatery: null, activity: null };
  }
  return {
    lodging: mains.legs.lodging?.placeId ?? null,
    eatery: mains.legs.eatery?.placeId ?? null,
    activity: mains.legs.activity?.placeId ?? null,
  };
}
