"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import { fetchGlobeContextPlaceGeocode } from "@/lib/globe/align-globe-context-places";
import { syncGlobeContextCardCoords } from "@/lib/globe/globe-context-card-coords";
import { globeContextHasConfirmedPlace } from "@/lib/globe/apply-globe-context-place-coords";
import { buildCanonicalPlaceProfile } from "@/lib/globe/canonical-place-profile";
import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import {
  stampGlobePlacePendingVerify,
  type GlobePlaceVerifySource,
} from "@/lib/globe/globe-place-pending-verify";
import { matchKoreaKnownCity } from "@/lib/globe/korea-known-places";
import { matchKoreaKnownPoi } from "@/lib/globe/korea-known-pois";
import { matchKoreaKnownNeighborhood } from "@/lib/globe/korea-known-neighborhoods";
import { matchKoreaMetroDistrict } from "@/lib/globe/korea-metro-districts";
import { normalizePlaceLabel } from "@/lib/globe/normalize-place-label";
import {
  findPersonalGlobePinByEventId,
  upsertPersonalGlobePin,
} from "@/lib/globe/personal-globe-pin-store";
import { sampleEphemeralGpsPlace } from "@/lib/globe/sample-ephemeral-gps-place";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { isGpsTrackingEnabled } from "@/lib/location-ping/gps-tracking-settings";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";

export type GeocodeSyncGlobeContextResult = {
  event: EventCandidate | null;
  needsPlaceVerify: boolean;
  askGpsOff: boolean;
  verifySource: GlobePlaceVerifySource | null;
};

function isCompoundPlaceLabel(label: string, cityLabel: string): boolean {
  const hay = label.trim();
  const city = cityLabel.trim();
  if (!hay || !city) {
    return false;
  }
  return hay !== city && hay.includes(city);
}

function isLowConfidencePlaceResolve(input: {
  label: string;
  apiConfirmed: boolean;
  knownLabel: string | null;
  fallbackLabel: string;
}): boolean {
  if (input.apiConfirmed) {
    return false;
  }
  if (input.knownLabel && isCompoundPlaceLabel(input.label, input.knownLabel)) {
    return true;
  }
  if (input.fallbackLabel === "한국") {
    return true;
  }
  if (!input.knownLabel && input.label.length >= 2) {
    return true;
  }
  return false;
}

/** Kakao/Naver geocode → confirmed globe pin. GPS one-shot when uncertain. */
export async function geocodeAndSyncGlobeContextPlace(input: {
  eventId: string;
  placeLabel: string;
  title?: string | null;
  userLat?: number | null;
  userLng?: number | null;
  force?: boolean;
}): Promise<GeocodeSyncGlobeContextResult> {
  const empty: GeocodeSyncGlobeContextResult = {
    event: null,
    needsPlaceVerify: false,
    askGpsOff: false,
    verifySource: null,
  };

  const key = input.eventId.trim();
  const label = normalizePlaceLabel(input.placeLabel);
  if (!key || !label) {
    return empty;
  }

  let event = findLifeEventCandidate(key);
  if (!event) {
    return empty;
  }

  if (!input.force && globeContextHasConfirmedPlace(event)) {
    return { ...empty, event };
  }

  const apiResolved = await fetchGlobeContextPlaceGeocode({
    place: label,
    title: input.title ?? event.title,
    userLat: input.userLat,
    userLng: input.userLng,
  });

  if (apiResolved?.confirmed) {
    const resolvedLabel = apiResolved.label.trim() || apiResolved.placeName.trim() || label;
    event = syncGlobeContextCardCoords(event, resolvedLabel, {
      lat: apiResolved.lat,
      lng: apiResolved.lng,
      label: resolvedLabel,
      formattedAddress: apiResolved.formattedAddress ?? null,
      placeProfile: buildCanonicalPlaceProfile({
        lat: apiResolved.lat,
        lng: apiResolved.lng,
        label: resolvedLabel,
        formattedAddress: apiResolved.formattedAddress ?? null,
        anchorSource: "manual_geocode",
        confidence: 0.97,
      }),
    });
    syncPersonalGlobePinFromEvent(event.id);
    return { ...empty, event };
  }

  const poi = matchKoreaKnownPoi(label);
  if (poi) {
    event = syncGlobeContextCardCoords(event, poi.label, {
      lat: poi.lat,
      lng: poi.lng,
      label: poi.label,
      placeProfile: buildCanonicalPlaceProfile({
        lat: poi.lat,
        lng: poi.lng,
        label: poi.label,
        anchorSource: "known_place",
        confidence: 0.88,
      }),
    });
    syncPersonalGlobePinFromEvent(event.id);
    return { ...empty, event };
  }

  const neighborhood = matchKoreaKnownNeighborhood(label);
  if (neighborhood) {
    event = syncGlobeContextCardCoords(event, neighborhood.label, {
      lat: neighborhood.lat,
      lng: neighborhood.lng,
      label: neighborhood.label,
      placeProfile: buildCanonicalPlaceProfile({
        lat: neighborhood.lat,
        lng: neighborhood.lng,
        label: neighborhood.label,
        anchorSource: "known_place",
        confidence: 0.92,
      }),
    });
    syncPersonalGlobePinFromEvent(event.id);
    return { ...empty, event };
  }

  const metroDistrict = matchKoreaMetroDistrict(label);
  if (metroDistrict) {
    event = syncGlobeContextCardCoords(event, metroDistrict.label, {
      lat: metroDistrict.lat,
      lng: metroDistrict.lng,
      label: metroDistrict.label,
      placeProfile: buildCanonicalPlaceProfile({
        lat: metroDistrict.lat,
        lng: metroDistrict.lng,
        label: metroDistrict.label,
        anchorSource: "known_place",
        confidence: 0.9,
      }),
    });
    syncPersonalGlobePinFromEvent(event.id);
    return { ...empty, event };
  }

  const knownCity = matchKoreaKnownCity(label);
  if (knownCity && !isCompoundPlaceLabel(label, knownCity.label)) {
    event = syncGlobeContextCardCoords(event, knownCity.label, {
      lat: knownCity.lat,
      lng: knownCity.lng,
      label: knownCity.label,
      placeProfile: buildCanonicalPlaceProfile({
        lat: knownCity.lat,
        lng: knownCity.lng,
        label: knownCity.label,
        anchorSource: "known_place",
        confidence: 0.84,
      }),
    });
    syncPersonalGlobePinFromEvent(event.id);
    return { ...empty, event };
  }

  const fallback = resolvePlaceCoordinates(label);
  const overseas = classifyOverseasManualPlace(label);
  const lowConfidence =
    overseas ||
    (fallback.label !== "한국" && fallback.label.trim() !== label.trim())
      ? false
      : isLowConfidencePlaceResolve({
          label,
          apiConfirmed: false,
          knownLabel: knownCity?.label ?? null,
          fallbackLabel: fallback.label,
        });

  if (lowConfidence) {
    const userLat = input.userLat;
    const userLng = input.userLng;
    if (
      typeof userLat === "number" &&
      typeof userLng === "number" &&
      Number.isFinite(userLat) &&
      Number.isFinite(userLng)
    ) {
      event = syncGlobeContextCardCoords(event, label, {
        lat: userLat,
        lng: userLng,
        label,
        placeProfile: buildCanonicalPlaceProfile({
          lat: userLat,
          lng: userLng,
          label,
          anchorSource: "gps_live",
          confidence: 0.4,
        }),
      });
      event = stampGlobePlacePendingVerify(event, {
        source: "low_confidence",
        askGpsOff: false,
      });
      syncPersonalGlobePinFromEvent(event.id);
      return {
        event,
        needsPlaceVerify: true,
        askGpsOff: false,
        verifySource: "low_confidence",
      };
    }

    const gps = await sampleEphemeralGpsPlace();
    if (gps) {
      const placeLabel = label || gps.placeLabel;
      event = syncGlobeContextCardCoords(event, placeLabel, {
        lat: gps.lat,
        lng: gps.lng,
        label: placeLabel,
        placeProfile: buildCanonicalPlaceProfile({
          lat: gps.lat,
          lng: gps.lng,
          label: placeLabel,
          anchorSource: "gps_live",
          confidence: 0.35,
        }),
      });
      event = stampGlobePlacePendingVerify(event, {
        source: "gps",
        askGpsOff: isGpsTrackingEnabled(),
      });
      syncPersonalGlobePinFromEvent(event.id);
      return {
        event,
        needsPlaceVerify: true,
        askGpsOff: isGpsTrackingEnabled(),
        verifySource: "gps",
      };
    }
  }

  if (fallback.label !== "한국" || label.length <= 12) {
    event = syncGlobeContextCardCoords(event, label, {
      lat: fallback.lat,
      lng: fallback.lng,
      label: fallback.label.trim() || label,
      placeProfile: buildCanonicalPlaceProfile({
        lat: fallback.lat,
        lng: fallback.lng,
        label: fallback.label.trim() || label,
        anchorSource: "known_place",
        confidence: lowConfidence ? 0.45 : 0.72,
      }),
    });
    if (lowConfidence) {
      event = stampGlobePlacePendingVerify(event, {
        source: "low_confidence",
        askGpsOff: false,
      });
      syncPersonalGlobePinFromEvent(event.id);
      return {
        event,
        needsPlaceVerify: true,
        askGpsOff: false,
        verifySource: "low_confidence",
      };
    }
    syncPersonalGlobePinFromEvent(event.id);
    return { ...empty, event };
  }

  const pin = findPersonalGlobePinByEventId(event.id);
  if (pin) {
    upsertPersonalGlobePin({
      ...pin,
      placeLabel: label,
    });
  }
  return { ...empty, event };
}
