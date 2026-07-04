#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { haversineKm } from "../lib/feed/spacetime-fit";
import {
  readCanonicalPlaceProfileFromEvent,
} from "../lib/globe/canonical-place-profile";
import { geocodeAndSyncGlobeContextPlace } from "../lib/globe/geocode-and-sync-globe-context-place";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

const SEOUL = { lat: 37.5665, lng: 126.978 };
const OSAKA = { lat: 34.6937, lng: 135.5023 };

async function run() {
  resetEventCandidatesForTests([]);
  const stamp = new Date().toISOString();
  const event = commitEventUpsert({
    id: "test-photo-force-geocode",
    title: "오사카 사진",
    category: "travel",
    source: "manual",
    lifecycle: "candidate",
    datetime: stamp,
    place: "오사카",
    confidence: 0.9,
    metadata: {
      globeManualContext: true,
      globePlaceConfirmed: true,
      globePlaceLat: SEOUL.lat,
      globePlaceLng: SEOUL.lng,
      globePlaceCardLat: SEOUL.lat,
      globePlaceCardLng: SEOUL.lng,
      globePlaceLabel: "서울 시청",
      globePlaceCardLabel: "서울 시청",
    },
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });

  const result = await geocodeAndSyncGlobeContextPlace({
    eventId: event.id,
    placeLabel: "오사카, 일본",
    title: event.title,
    userLat: SEOUL.lat,
    userLng: SEOUL.lng,
    force: true,
  });

  assert.ok(result.event, "forced place sync should keep returning the updated event");
  const profile = readCanonicalPlaceProfileFromEvent(result.event!);
  assert.ok(profile, "forced place sync should stamp a canonical profile");
  assert.equal(profile?.countryCode, "JP");
  assert.equal(profile?.city, "오사카");
  assert.ok(
    haversineKm(profile!.lat, profile!.lng, OSAKA.lat, OSAKA.lng) < 50,
    "forced place sync should override stale Seoul GPS with Osaka anchor",
  );
  assert.equal(result.needsPlaceVerify, false);

  console.log("test-photo-place-force-geocode: ok");
}

void run();
