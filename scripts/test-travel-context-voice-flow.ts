#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { resetEntityGraphStoreForTests } from "../lib/ontology";
import { classifyExperienceRunIntent } from "../lib/experience-run/classify-experience-run-intent";
import { resolveExperienceRunTurn } from "../lib/experience-run/resolve-experience-run-turn";
import {
  clearPendingSituationLock,
  readPendingSituationLock,
} from "../lib/experience-run/situation-lock";
import { haversineKm } from "../lib/feed/spacetime-fit";
import { resolveEventGlobeCoords } from "../lib/globe/resolve-event-globe-coords";
import { findPersonalGlobePinByEventId, resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import {
  nextTravelSlot,
  parseDurationDaysFromText,
  parseTravelSlotsFromMessage,
} from "../lib/experience-run/travel-context-slots";
import { listLifeEventCandidates } from "../lib/life-read-model";

const SEOUL = { lat: 37.5665, lng: 126.978 };
const JEJU = { lat: 33.4996, lng: 126.5312 };

const storage = new Map<string, string>();

(globalThis as { sessionStorage?: Storage }).sessionStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => {
    storage.set(key, value);
  },
  removeItem: (key) => {
    storage.delete(key);
  },
  clear: () => storage.clear(),
  key: () => null,
  length: 0,
};

resetEventCandidatesForTests([]);
resetEntityGraphStoreForTests();
resetPersonalGlobePinsForTests();
clearPendingSituationLock();

const REF = "2026-07-03";

const seed = "나 내일 제주도 놀러가";
const slots = parseTravelSlotsFromMessage(seed, REF);
assert.equal(slots.destination, "제주");
assert.ok(slots.anchorTimeIso, "내일 anchor parsed");
assert.equal(slots.durationDays, null);

const intent = classifyExperienceRunIntent(seed, REF);
assert.equal(intent?.profile, "leisure_travel");
assert.equal(intent?.needsClarify, true);
assert.ok(intent?.clarifyPromptKo?.includes("며칠"));

assert.equal(parseDurationDaysFromText("4일 다녀올 예정이야"), 4);
assert.equal(nextTravelSlot({ destination: "제주", durationDays: 4, anchorTimeIso: "2026-07-04T09:00:00" }), "origin_location");

async function runFlow() {
  clearPendingSituationLock();
  resetEventCandidatesForTests([]);
  resetPersonalGlobePinsForTests();

  const step1 = await resolveExperienceRunTurn({ message: seed, referenceDate: REF });
  assert.equal(step1.kind, "clarify");
  if (step1.kind !== "clarify") {
    return;
  }
  assert.equal(step1.pendingSlot, "duration");
  assert.ok(readPendingSituationLock());

  const step2 = await resolveExperienceRunTurn({
    message: "4일 다녀올 예정이야",
    referenceDate: REF,
  });
  assert.equal(step2.kind, "clarify");
  if (step2.kind !== "clarify") {
    return;
  }
  assert.equal(step2.pendingSlot, "origin_location");
  assert.ok(step2.questionKo.includes("4일 확인"));
  assert.equal(step2.offerGps, true);

  const step3 = await resolveExperienceRunTurn({
    message: "GPS",
    referenceDate: REF,
    lat: 37.5665,
    lng: 126.978,
  });
  assert.equal(step3.kind, "summary");
  if (step3.kind !== "summary") {
    return;
  }
  assert.ok(step3.summary.eventId);

  const events = listLifeEventCandidates();
  const created = events.find((event) => event.id === step3.summary.eventId);
  assert.ok(created);
  assert.equal(created?.place, "제주");
  assert.equal(created?.category, "travel");
  assert.equal(created?.metadata?.planNights, 4);
  assert.equal(created?.metadata?.globePlaceConfirmed, true);
  const coords = resolveEventGlobeCoords(created!);
  assert.ok(
    haversineKm(coords.lat, coords.lng, JEJU.lat, JEJU.lng) < 20,
    "explicit Jeju destination should anchor the context",
  );
  assert.ok(
    haversineKm(coords.lat, coords.lng, SEOUL.lat, SEOUL.lng) > 300,
    "live Seoul GPS must not override the destination anchor",
  );
  const pin = findPersonalGlobePinByEventId(created!.id);
  assert.ok(pin, "travel flow should create a globe pin");
  assert.ok(
    haversineKm(pin!.lat, pin!.lng, JEJU.lat, JEJU.lng) < 20,
    "globe pin should land near Jeju",
  );
  assert.ok(!readPendingSituationLock());
}

void runFlow().then(() => {
  console.log("test-travel-context-voice-flow: ok");
});
