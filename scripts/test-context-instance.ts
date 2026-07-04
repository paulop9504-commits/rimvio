#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildContextInstance } from "../lib/context-instance/build-context-instance";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import { resetEntityGraphStoreForTests } from "../lib/ontology";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";
import { haversineKm } from "../lib/feed/spacetime-fit";

const SEOUL = { lat: 37.5665, lng: 126.978 };
const OSAKA = { lat: 34.6937, lng: 135.5023 };

resetEventCandidatesForTests([]);
resetEntityGraphStoreForTests();
resetPersonalGlobePinsForTests();

const event = commitEventUpsert({
  id: "ev-context-instance-osaka",
  title: "오사카 여행 3박4일",
  category: "travel",
  source: "message",
  lifecycle: "scheduled",
  datetime: "2026-07-10T19:30:00+09:00",
  place: "오사카",
  confidence: 0.91,
  metadata: {
    feedPlanEnabled: true,
    gpsDwellLat: SEOUL.lat,
    gpsDwellLng: SEOUL.lng,
    gpsDwellPlaceLabel: "서울 시청",
    travelOriginLat: SEOUL.lat,
    travelOriginLng: SEOUL.lng,
    travelOriginLabel: "서울",
  },
});

const remote = buildContextInstance({
  event,
  lat: SEOUL.lat,
  lng: SEOUL.lng,
  preferUserLocation: true,
  surface: "composer",
  layerMode: "discovery",
});

assert.equal(remote.location.anchor.source, "travel_destination");
assert.equal(remote.location.anchor.profile.countryCode, "JP");
assert.equal(remote.travel.destinationLabel, "오사카");
assert.equal(remote.travel.nights, 4);
assert.equal(remote.travel.overseas, true);
assert.equal(remote.location.searchOriginSource, "stable_anchor");
assert.equal(remote.movement.relationToAnchor, "remote_from_anchor");
assert.ok(
  haversineKm(
    remote.location.searchOrigin!.lat,
    remote.location.searchOrigin!.lng,
    OSAKA.lat,
    OSAKA.lng,
  ) < 10,
  "remote viewer GPS must not override the travel anchor",
);

const nearby = buildContextInstance({
  event,
  lat: OSAKA.lat,
  lng: OSAKA.lng,
  preferUserLocation: true,
});

assert.equal(nearby.location.searchOriginSource, "viewer_near_anchor");
assert.equal(nearby.movement.relationToAnchor, "on_anchor");
assert.ok(
  haversineKm(
    nearby.location.searchOrigin!.lat,
    nearby.location.searchOrigin!.lng,
    OSAKA.lat,
    OSAKA.lng,
  ) < 0.5,
  "nearby viewer GPS should be reused when already on the anchor",
);

const daejeonWork = commitEventUpsert({
  id: "ev-context-instance-daejeon-work",
  title: "대전 외근",
  category: "custom",
  source: "message",
  lifecycle: "scheduled",
  datetime: "2026-07-12T10:00:00+09:00",
  confidence: 0.84,
  metadata: {
    globePlaceConfirmed: true,
    globePlaceLat: SEOUL.lat,
    globePlaceLng: SEOUL.lng,
    globePlaceLabel: "서울 시청",
  },
});

const daejeonContext = buildContextInstance({
  event: daejeonWork,
  lat: SEOUL.lat,
  lng: SEOUL.lng,
  preferUserLocation: true,
});

assert.equal(daejeonContext.location.anchor.source, "travel_destination");
assert.equal(daejeonContext.travel.destinationLabel, "대전");
assert.equal(daejeonContext.signals.hasTitlePlaceHint, true);
assert.equal(daejeonContext.title.purpose, "business_trip");
assert.ok(
  haversineKm(
    daejeonContext.location.anchor.lat,
    daejeonContext.location.anchor.lng,
    36.3504,
    127.3845,
  ) < 15,
  "title place hint should lift 대전 into the stable anchor",
);

const osakaMismatch = commitEventUpsert({
  id: "ev-context-instance-osaka-mismatch",
  title: "오사카 야식",
  category: "custom",
  source: "message",
  lifecycle: "scheduled",
  datetime: "2026-07-10T23:00:00+09:00",
  confidence: 0.82,
  metadata: {
    globePlaceConfirmed: true,
    globePlaceLat: SEOUL.lat,
    globePlaceLng: SEOUL.lng,
    globePlaceLabel: "서울 시청",
  },
});

const mismatchContext = buildContextInstance({
  event: osakaMismatch,
  lat: SEOUL.lat,
  lng: SEOUL.lng,
});

assert.equal(mismatchContext.location.anchor.source, "canonical_profile");
assert.equal(mismatchContext.title.primaryPlaceHint?.label, "오사카");
assert.equal(mismatchContext.signals.hasTitleMeaningConflict, true);
assert.equal(mismatchContext.title.conflict.severity, "hard");
assert.ok(mismatchContext.title.conflict.reasons.includes("anchor_country_mismatch"));

console.log("test-context-instance: ok");
