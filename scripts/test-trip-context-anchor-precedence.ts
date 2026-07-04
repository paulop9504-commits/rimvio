#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { ensureTripContextEvent } from "../lib/experience-run/ensure-trip-context-event";
import { haversineKm } from "../lib/feed/spacetime-fit";
import { readCanonicalPlaceProfileFromEvent } from "../lib/globe/canonical-place-profile";
import { resolveContextLodgingSearchCoords } from "../lib/globe/context-hub/resolve-context-lodging-search-coords";
import { findPersonalGlobePinByEventId, resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import { resolveEventGlobeCoords } from "../lib/globe/resolve-event-globe-coords";
import { resetEntityGraphStoreForTests } from "../lib/ontology";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

const SEOUL = { lat: 37.5665, lng: 126.978 };
const OSAKA = { lat: 34.6937, lng: 135.5023 };

function run() {
  resetEventCandidatesForTests([]);
  resetEntityGraphStoreForTests();
  resetPersonalGlobePinsForTests();

  const event = ensureTripContextEvent({
    message: "오사카 여행 갈래",
    referenceDate: "2026-07-04",
    profile: "leisure_travel",
    travelSlots: {
      destination: "오사카",
      durationDays: 3,
      anchorTimeIso: "2026-07-10T09:00:00+09:00",
      originLabel: "현재 위치",
      originLat: SEOUL.lat,
      originLng: SEOUL.lng,
    },
  });

  assert.equal(event.place, "오사카");
  assert.equal(event.metadata?.globePlaceConfirmed, true);
  const placeProfile = readCanonicalPlaceProfileFromEvent(event);
  assert.ok(placeProfile, "trip context should stamp a canonical place profile");
  assert.equal(placeProfile?.countryCode, "JP");
  assert.equal(placeProfile?.city, "오사카");
  assert.equal(placeProfile?.countryName, "일본");
  assert.equal(placeProfile?.timezone, "Asia/Tokyo");
  assert.equal(placeProfile?.anchorSource, "explicit_destination");

  const createdCoords = resolveEventGlobeCoords(event);
  assert.ok(
    haversineKm(createdCoords.lat, createdCoords.lng, OSAKA.lat, OSAKA.lng) < 10,
    "explicit Osaka destination should resolve to Osaka",
  );

  const pin = findPersonalGlobePinByEventId(event.id);
  assert.ok(pin, "trip context should create a globe pin");
  assert.ok(
    haversineKm(pin!.lat, pin!.lng, OSAKA.lat, OSAKA.lng) < 10,
    "pin should persist the explicit Osaka anchor",
  );

  const withGpsDwell = commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    confidence: event.confidence,
    metadata: {
      ...(event.metadata ?? {}),
      gpsDwellLat: SEOUL.lat,
      gpsDwellLng: SEOUL.lng,
      gpsDwellPlaceLabel: "서울 시청",
    },
    lifecycleUpdatedAt: event.lifecycleUpdatedAt,
  });

  const rehydratedCoords = resolveEventGlobeCoords(withGpsDwell);
  assert.ok(
    haversineKm(rehydratedCoords.lat, rehydratedCoords.lng, OSAKA.lat, OSAKA.lng) < 10,
    "confirmed destination anchor must outrank later GPS dwell data",
  );

  const searchOrigin = resolveContextLodgingSearchCoords(withGpsDwell, {
    lat: SEOUL.lat,
    lng: SEOUL.lng,
    preferUserLocation: true,
  });
  assert.ok(searchOrigin);
  assert.ok(
    haversineKm(searchOrigin!.lat, searchOrigin!.lng, OSAKA.lat, OSAKA.lng) < 10,
    "downstream lodging/eatery origin should stay on Osaka, not Seoul GPS",
  );

  console.log("test-trip-context-anchor-precedence: ok");
}

run();
