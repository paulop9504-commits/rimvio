import type { EventCandidate } from "@/lib/events/event-candidate";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { inferContextTitleMeaning, type ContextTitleInference } from "@/lib/context-title/infer-context-title";
import {
  buildCanonicalPlaceProfile,
  isCanonicalPlaceCountryCompatible,
  readCanonicalPlaceProfileFromEvent,
  resolveCanonicalPlaceAreaLabel,
  type CanonicalPlaceProfile,
} from "@/lib/globe/canonical-place-profile";
import { resolveContextPlaceLabel } from "@/lib/globe/context-hub/resolve-context-place-label";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { resolveTripContextAnchor } from "@/lib/experience-run/resolve-trip-context-anchor";
import { parseDurationDaysFromText } from "@/lib/experience-run/travel-context-slots";

export const CONTEXT_ANCHOR_NEAR_KM = 25 as const;

export type ContextAnchorSource =
  | "canonical_profile"
  | "travel_destination"
  | "confirmed_place"
  | "event_pin"
  | "event_fallback";

export type ContextRelationToAnchor =
  | "on_anchor"
  | "near_anchor"
  | "remote_from_anchor"
  | "unknown";

export type ContextSearchOriginSource =
  | "viewer_near_anchor"
  | "stable_anchor"
  | "viewer_fallback";

export type ContextDayPart =
  | "early_morning"
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "unknown";

export type ContextWeekdayBucket = "weekday" | "friday" | "weekend" | "unknown";

export type ContextPlaceAnchor = {
  lat: number;
  lng: number;
  label: string;
  source: ContextAnchorSource;
  profile: CanonicalPlaceProfile;
};

export type ContextInstance = {
  eventId: string;
  eventCategory: EventCandidate["category"];
  input: {
    message: string | null;
    surface: string | null;
    layerMode: string | null;
  };
  signals: {
    hasCanonicalPlace: boolean;
    hasTravelDestination: boolean;
    hasPlanWindow: boolean;
    hasTravelOrigin: boolean;
    hasUserCoords: boolean;
    hasTitlePlaceHint: boolean;
    hasTitleMeaningConflict: boolean;
  };
  title: ContextTitleInference;
  time: {
    referenceIso: string;
    startIso: string | null;
    endIso: string | null;
    timezone: string | null;
    dayPart: ContextDayPart;
    weekdayBucket: ContextWeekdayBucket;
  };
  location: {
    canonicalProfile: CanonicalPlaceProfile | null;
    anchor: ContextPlaceAnchor;
    userCoords: { lat: number; lng: number } | null;
    searchOrigin: { lat: number; lng: number } | null;
    searchOriginSource: ContextSearchOriginSource | null;
    distanceToAnchorKm: number | null;
    areaLabel: string | null;
  };
  movement: {
    relationToAnchor: ContextRelationToAnchor;
    shouldPreferUserCoords: boolean;
  };
  travel: {
    destinationLabel: string | null;
    nights: number | null;
    originLabel: string | null;
    originCoords: { lat: number; lng: number } | null;
    overseas: boolean;
  };
};

type BuildContextInstanceInput = {
  event: EventCandidate;
  message?: string | null;
  lat?: number | null;
  lng?: number | null;
  preferUserLocation?: boolean;
  surface?: string | null;
  layerMode?: string | null;
  now?: Date;
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveTravelNights(event: EventCandidate): number | null {
  const plan = readPlanContextFromEvent(event);
  if (typeof plan?.nights === "number" && plan.nights > 0) {
    return plan.nights;
  }
  const title = normalizeText(event.title);
  const nightDay = title.match(/(\d{1,2})\s*박\s*(\d{1,2})\s*일/u);
  if (nightDay?.[2]) {
    const days = Number.parseInt(nightDay[2], 10);
    return Number.isFinite(days) && days > 0 ? days : null;
  }
  return parseDurationDaysFromText(title) ?? null;
}

function resolveContextStartIso(event: EventCandidate): string | null {
  const plan = readPlanContextFromEvent(event);
  return normalizeText(plan?.windowStartIso) || normalizeText(event.datetime) || null;
}

function resolveContextEndIso(event: EventCandidate): string | null {
  const plan = readPlanContextFromEvent(event);
  return normalizeText(plan?.windowEndIso) || null;
}

function resolveDayPart(date: Date | null): ContextDayPart {
  if (!date || Number.isNaN(date.getTime())) {
    return "unknown";
  }
  const hour = date.getHours();
  if (hour < 6) {
    return "early_morning";
  }
  if (hour < 12) {
    return "morning";
  }
  if (hour < 17) {
    return "afternoon";
  }
  if (hour < 21) {
    return "evening";
  }
  return "night";
}

function resolveWeekdayBucket(date: Date | null): ContextWeekdayBucket {
  if (!date || Number.isNaN(date.getTime())) {
    return "unknown";
  }
  const day = date.getDay();
  if (day === 5) {
    return "friday";
  }
  if (day === 0 || day === 6) {
    return "weekend";
  }
  return "weekday";
}

function isTravelLikeContext(event: EventCandidate): boolean {
  const titleMeaning = inferContextTitleMeaning({ title: event.title });
  if (event.category === "travel") {
    return true;
  }
  const plan = readPlanContextFromEvent(event);
  if (normalizeText(plan?.place)) {
    return true;
  }
  if (
    titleMeaning.purpose === "travel" ||
    titleMeaning.purpose === "business_trip" ||
    titleMeaning.purpose === "lodging"
  ) {
    return true;
  }
  return event.metadata?.feedPlanEnabled === true;
}

function resolveTravelDestinationCandidate(
  event: EventCandidate,
  titleMeaning?: ContextTitleInference | null,
): ReturnType<typeof resolveTripContextAnchor> {
  const plan = readPlanContextFromEvent(event);
  const titlePlace = titleMeaning?.primaryPlaceHint?.profile.label ?? null;
  const candidates = [plan?.place, event.place, titlePlace, event.title];
  for (const value of candidates) {
    const label = normalizeText(value);
    if (!label) {
      continue;
    }
    const anchor = resolveTripContextAnchor(label);
    if (anchor) {
      return anchor;
    }
  }
  return null;
}

function buildAnchorFromProfile(
  profile: CanonicalPlaceProfile,
  source: ContextAnchorSource,
): ContextPlaceAnchor {
  return {
    lat: profile.lat,
    lng: profile.lng,
    label: profile.label,
    source,
    profile,
  };
}

function buildConfirmedPlaceAnchor(
  event: EventCandidate,
  fallbackLabel: string,
): ContextPlaceAnchor | null {
  const meta = event.metadata ?? {};
  const lat = readFiniteCoord(meta.globePlaceLat);
  const lng = readFiniteCoord(meta.globePlaceLng);
  if (meta.globePlaceConfirmed !== true || lat == null || lng == null) {
    return null;
  }
  const label =
    normalizeText(typeof meta.globePlaceLabel === "string" ? meta.globePlaceLabel : "") ||
    fallbackLabel;
  if (!label) {
    return null;
  }
  return {
    lat,
    lng,
    label,
    source: "confirmed_place",
    profile: buildCanonicalPlaceProfile({
      lat,
      lng,
      label,
      anchorSource: "legacy_globe_place",
      confidence: 0.9,
    }),
  };
}

function buildEventPinAnchor(
  event: EventCandidate,
  fallbackLabel: string,
): ContextPlaceAnchor | null {
  const pin = findPersonalGlobePinByEventId(event.id);
  if (!pin || !Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) {
    return null;
  }
  const label = normalizeText(pin.placeLabel) || fallbackLabel;
  if (!label) {
    return null;
  }
  return {
    lat: pin.lat,
    lng: pin.lng,
    label,
    source: "event_pin",
    profile: buildCanonicalPlaceProfile({
      lat: pin.lat,
      lng: pin.lng,
      label,
      anchorSource: "event_pin",
      confidence: 0.84,
    }),
  };
}

function buildFallbackAnchor(event: EventCandidate): ContextPlaceAnchor {
  const coords = resolveEventGlobeCoords(event);
  return {
    lat: coords.lat,
    lng: coords.lng,
    label: normalizeText(coords.placeLabel) || normalizeText(event.title) || "맥락",
    source: "event_fallback",
    profile: buildCanonicalPlaceProfile({
      lat: coords.lat,
      lng: coords.lng,
      label: normalizeText(coords.placeLabel) || normalizeText(event.title) || "맥락",
      anchorSource: "fallback",
      confidence: 0.68,
    }),
  };
}

function shouldKeepCanonicalAnchorForTravel(
  canonical: CanonicalPlaceProfile,
  travelDestination: NonNullable<ReturnType<typeof resolveTravelDestinationCandidate>>,
): boolean {
  if (canonical.anchorSource === "gps_dwell") {
    return false;
  }
  if (
    haversineKm(canonical.lat, canonical.lng, travelDestination.lat, travelDestination.lng) >
    CONTEXT_ANCHOR_NEAR_KM
  ) {
    return false;
  }
  return isCanonicalPlaceCountryCompatible(canonical, travelDestination.placeLabel);
}

export function resolveStableContextPlaceAnchor(event: EventCandidate): ContextPlaceAnchor {
  const fallbackLabel = resolveContextPlaceLabel(event);
  const canonicalProfile = readCanonicalPlaceProfileFromEvent(event);
  const titleMeaning = inferContextTitleMeaning({ title: event.title });
  const travelDestination = isTravelLikeContext(event)
    ? resolveTravelDestinationCandidate(event, titleMeaning)
    : null;

  if (travelDestination) {
    const pinAnchor = buildEventPinAnchor(event, travelDestination.placeLabel);
    if (
      pinAnchor &&
      haversineKm(pinAnchor.lat, pinAnchor.lng, travelDestination.lat, travelDestination.lng) <=
        CONTEXT_ANCHOR_NEAR_KM
    ) {
      return pinAnchor;
    }

    if (
      canonicalProfile &&
      shouldKeepCanonicalAnchorForTravel(canonicalProfile, travelDestination)
    ) {
      return buildAnchorFromProfile(canonicalProfile, "canonical_profile");
    }

    const confirmedAnchor = buildConfirmedPlaceAnchor(event, travelDestination.placeLabel);
    if (
      confirmedAnchor &&
      haversineKm(
        confirmedAnchor.lat,
        confirmedAnchor.lng,
        travelDestination.lat,
        travelDestination.lng,
      ) <= CONTEXT_ANCHOR_NEAR_KM
    ) {
      return confirmedAnchor;
    }

    return {
      lat: travelDestination.lat,
      lng: travelDestination.lng,
      label: travelDestination.placeLabel,
      source: "travel_destination",
      profile: travelDestination.profile,
    };
  }

  if (canonicalProfile) {
    return buildAnchorFromProfile(canonicalProfile, "canonical_profile");
  }

  return (
    buildEventPinAnchor(event, fallbackLabel) ??
    buildConfirmedPlaceAnchor(event, fallbackLabel) ??
    buildFallbackAnchor(event)
  );
}

function resolveRelationToAnchor(distanceToAnchorKm: number | null): ContextRelationToAnchor {
  if (distanceToAnchorKm == null) {
    return "unknown";
  }
  if (distanceToAnchorKm <= 2) {
    return "on_anchor";
  }
  if (distanceToAnchorKm <= CONTEXT_ANCHOR_NEAR_KM) {
    return "near_anchor";
  }
  return "remote_from_anchor";
}

function readTravelOrigin(event: EventCandidate): {
  originLabel: string | null;
  originCoords: { lat: number; lng: number } | null;
} {
  const meta = event.metadata ?? {};
  const lat = readFiniteCoord(meta.travelOriginLat);
  const lng = readFiniteCoord(meta.travelOriginLng);
  return {
    originLabel:
      normalizeText(typeof meta.travelOriginLabel === "string" ? meta.travelOriginLabel : "") ||
      null,
    originCoords: lat != null && lng != null ? { lat, lng } : null,
  };
}

export function buildContextInstance(input: BuildContextInstanceInput): ContextInstance {
  const baseTitleMeaning = inferContextTitleMeaning({ title: input.event.title });
  const anchor = resolveStableContextPlaceAnchor(input.event);
  const title = inferContextTitleMeaning({
    title: input.event.title,
    anchorProfile: anchor.profile,
  });
  const canonicalProfile = readCanonicalPlaceProfileFromEvent(input.event);
  const startIso = resolveContextStartIso(input.event);
  const endIso = resolveContextEndIso(input.event);
  const referenceDate = input.now ?? new Date();
  const timeAnchor = startIso ? new Date(startIso) : referenceDate;
  const plan = readPlanContextFromEvent(input.event);
  const destinationCandidate = resolveTravelDestinationCandidate(input.event, baseTitleMeaning);
  const userLat = readFiniteCoord(input.lat);
  const userLng = readFiniteCoord(input.lng);
  const userCoords =
    userLat != null && userLng != null ? { lat: userLat, lng: userLng } : null;
  const distanceToAnchorKm =
    userCoords == null ? null : haversineKm(userCoords.lat, userCoords.lng, anchor.lat, anchor.lng);
  const shouldPreferUserCoords =
    input.preferUserLocation === true &&
    userCoords != null &&
    distanceToAnchorKm != null &&
    distanceToAnchorKm <= CONTEXT_ANCHOR_NEAR_KM;
  const searchOrigin = shouldPreferUserCoords
    ? userCoords
    : { lat: anchor.lat, lng: anchor.lng };
  const searchOriginSource =
    shouldPreferUserCoords
      ? "viewer_near_anchor"
      : "stable_anchor";
  const { originLabel, originCoords } = readTravelOrigin(input.event);
  const planPlaceLabel = normalizeText(plan?.place) || null;

  return {
    eventId: input.event.id,
    eventCategory: input.event.category,
    input: {
      message: normalizeText(input.message) || null,
      surface: normalizeText(input.surface) || null,
      layerMode: normalizeText(input.layerMode) || null,
    },
    signals: {
      hasCanonicalPlace: canonicalProfile != null,
      hasTravelDestination: destinationCandidate != null,
      hasPlanWindow: Boolean(startIso || endIso || plan?.windowStartIso || plan?.windowEndIso),
      hasTravelOrigin: originCoords != null,
      hasUserCoords: userCoords != null,
      hasTitlePlaceHint: title.primaryPlaceHint != null,
      hasTitleMeaningConflict: title.conflict.severity !== "none",
    },
    title,
    time: {
      referenceIso: referenceDate.toISOString(),
      startIso,
      endIso,
      timezone: anchor.profile.timezone ?? null,
      dayPart: resolveDayPart(timeAnchor),
      weekdayBucket: resolveWeekdayBucket(timeAnchor),
    },
    location: {
      canonicalProfile,
      anchor,
      userCoords,
      searchOrigin,
      searchOriginSource,
      distanceToAnchorKm,
      areaLabel:
        resolveCanonicalPlaceAreaLabel(anchor.profile) ||
        title.primaryPlaceHint?.profile.searchHints.areaLabel ||
        normalizeText(plan?.place) ||
        normalizeText(input.event.place) ||
        null,
    },
    movement: {
      relationToAnchor: resolveRelationToAnchor(distanceToAnchorKm),
      shouldPreferUserCoords,
    },
    travel: {
      destinationLabel:
        destinationCandidate?.placeLabel ??
        anchor.profile.label ??
        planPlaceLabel,
      nights: resolveTravelNights(input.event),
      originLabel,
      originCoords,
      overseas:
        anchor.profile.countryCode != null
          ? anchor.profile.countryCode !== "KR"
          : Boolean(
              destinationCandidate?.profile.countryCode &&
                destinationCandidate.profile.countryCode !== "KR",
            ),
    },
  };
}
