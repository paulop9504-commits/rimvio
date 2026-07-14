#!/usr/bin/env npx tsx
/**
 * Companion trip intents — 신혼 / 가족 / 출장 / 혼자 / 친구
 * sourceMessage persists past city-title rewrite.
 */

import assert from "node:assert/strict";
import { ensureTripContextEvent } from "../lib/experience-run/ensure-trip-context-event";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { buildTravelBrainState } from "../lib/situation-projection/travel-brain-personalization";
import { resolveLodgingRankProfileFromTravelBrain } from "../lib/globe/lodging/resolve-lodging-rank-profile-from-travel-brain";
import { resolveEateryRankProfileFromTravelBrain } from "../lib/globe/eatery/resolve-eatery-rank-profile-from-travel-brain";

const memory = new Map<string, string>();
const storage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memory.set(k, v);
  },
  removeItem: (k: string) => {
    memory.delete(k);
  },
  clear: () => memory.clear(),
};
const win = {
  localStorage: storage,
  sessionStorage: storage,
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
Object.assign(globalThis, {
  localStorage: storage,
  sessionStorage: storage,
  window: win,
});

resetEventCandidatesForTests([]);

const cases = [
  {
    message: "신혼 여행가려고",
    companion: "couple",
    lodging: "aesthetic",
  },
  {
    message: "부모님 모시고 오사카 가족여행",
    companion: "parents",
    lodging: "family",
  },
  {
    message: "친구들이랑 도쿄 놀러가",
    companion: "friends",
    lodging: "price",
  },
  {
    message: "혼자 여행 가려고",
    companion: "solo",
    lodging: null as string | null,
  },
  {
    message: "다음 주 도쿄 출장",
    companion: "solo",
    lodging: "station",
  },
] as const;

for (const row of cases) {
  memory.clear();
  resetEventCandidatesForTests([]);
  const event = ensureTripContextEvent({
    message: row.message,
    profile: /출장/.test(row.message) ? "business_trip" : "leisure_travel",
  });
  assert.equal(
    typeof event.metadata?.sourceMessage === "string"
      ? event.metadata.sourceMessage
      : "",
    row.message,
    `sourceMessage must keep utterance for ${row.message}`,
  );

  // Simulate city confirm title rewrite without wiping sourceMessage.
  const afterCity = {
    ...event,
    title: /출장/.test(row.message) ? "도쿄 출장" : "오사카 여행",
    place: /도쿄/.test(row.message) ? "도쿄" : "오사카",
    metadata: { ...(event.metadata ?? {}) },
  };
  const brain = buildTravelBrainState(afterCity);
  assert.equal(
    brain.slots.companion_mode.value,
    row.companion,
    `${row.message} → companion`,
  );
  if (row.lodging) {
    assert.equal(
      brain.slots.lodging_priority.value,
      row.lodging,
      `${row.message} → lodging_priority`,
    );
  }

  if (row.companion === "couple") {
    const lodgingProfile = resolveLodgingRankProfileFromTravelBrain({
      travelBrain: brain,
    });
    const eateryProfile = resolveEateryRankProfileFromTravelBrain({
      travelBrain: brain,
    });
    assert.ok(lodgingProfile.weights.quality > 0.36);
    assert.ok(eateryProfile.weights.vibe > 0.2);
  }
}

console.log("✓ companion trip intents (honeymoon · family · friends · solo · business)");
