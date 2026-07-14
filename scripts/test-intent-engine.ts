#!/usr/bin/env npx tsx
/**
 * Intent Engine V1 — NL → IntentBlueprint → Travel projection.
 */

import assert from "node:assert/strict";
import {
  compileIntentBlueprint,
  projectIntentBlueprintToTravel,
} from "../lib/intent-engine";
import { ensureTripContextEvent } from "../lib/experience-run/ensure-trip-context-event";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { buildTravelBrainState } from "../lib/situation-projection/travel-brain-personalization";

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

// --- Blueprint: honeymoon alone ---
{
  const bp = compileIntentBlueprint({ text: "신혼여행" });
  assert.ok(bp.intents.some((i) => i.libraryId === "travel.honeymoon"));
  assert.ok(bp.mood.includes("Romantic"));
  assert.ok((bp.mergedProfile.romantic ?? 0) >= 0.9);
  assert.ok(bp.missing_information.includes("destination"));
}

// --- Blueprint: indie alone ---
{
  const bp = compileIntentBlueprint({ text: "인디감성으로 가고 싶어" });
  assert.ok(bp.intents.some((i) => i.libraryId === "mood.indie"));
  assert.ok(bp.mood.includes("Indie"));
  assert.ok(bp.style.includes("cafe"));
  assert.ok((bp.mergedProfile.local ?? 0) >= 0.85);
}

// --- Merged: 신혼 + 인디 ---
{
  const bp = compileIntentBlueprint({
    text: "신혼여행인데 인디감성으로 가고 싶어",
  });
  const ids = bp.intents.map((i) => i.libraryId);
  assert.ok(ids.includes("travel.honeymoon"));
  assert.ok(ids.includes("mood.indie"));
  assert.ok(bp.mood.includes("Romantic"));
  assert.ok(bp.mood.includes("Indie"));
  assert.ok(bp.constraints.includes("prefer_indie_romantic_blend"));
  assert.ok((bp.mergedProfile.privacy ?? 0) >= 0.85);
  assert.ok((bp.mergedProfile.cafe ?? 0) >= 0.85);

  const travel = projectIntentBlueprintToTravel(bp);
  assert.equal(travel.companionMode?.value, "couple");
  assert.equal(travel.lodgingPriority?.value, "aesthetic");
  assert.equal(travel.foodBias?.value, "cafe");
  assert.equal(travel.contentIntent?.value, "photo");
}

// --- Travel Brain wire ---
{
  memory.clear();
  resetEventCandidatesForTests([]);
  const event = ensureTripContextEvent({
    message: "신혼여행인데 인디감성으로 가고 싶어",
    profile: "leisure_travel",
  });
  const state = buildTravelBrainState(event);
  assert.equal(state.slots.companion_mode.value, "couple");
  assert.equal(state.slots.lodging_priority.value, "aesthetic");
  assert.equal(state.slots.food_bias.value, "cafe");
  assert.equal(state.slots.content_intent.value, "photo");
}

console.log("✓ intent engine (honeymoon · indie · merged → travel brain)");
