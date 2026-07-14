#!/usr/bin/env npx tsx
/**
 * Intent Engine LLM slot filler — regex miss → closed library_ids → Blueprint.
 */

import assert from "node:assert/strict";
import {
  compileIntentBlueprint,
  compileIntentBlueprintViaLlm,
  needsIntentSlotLlmFill,
  parseIntents,
  parseIntentSlotFillWire,
  projectIntentBlueprintToTravel,
  validateIntentSlotFillWire,
  wireToParsedIntentHits,
} from "../lib/intent-engine";
import {
  INTENT_BLUEPRINT_META_KEY,
  readIntentBlueprintFromEvent,
} from "../lib/intent-engine/intent-blueprint-metadata";
import { ensureTripContextEvent } from "../lib/experience-run/ensure-trip-context-event";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { buildTravelBrainState } from "../lib/situation-projection/travel-brain-personalization";

async function main() {
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
  Object.assign(globalThis, {
    localStorage: storage,
    sessionStorage: storage,
    window: {
      localStorage: storage,
      sessionStorage: storage,
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });

  assert.equal(
    validateIntentSlotFillWire({
      library_ids: ["travel.honeymoon", "mood.indie"],
    }).length,
    0,
  );
  assert.ok(
    validateIntentSlotFillWire({ library_ids: ["travel.unknown_xyz"] }).length > 0,
  );
  assert.equal(parseIntentSlotFillWire('{"library_ids":["not.real"]}'), null);
  const ok = parseIntentSlotFillWire(
    JSON.stringify({
      library_ids: ["travel.couple"],
      confidence: 0.77,
    }),
  );
  assert.ok(ok);
  assert.equal(wireToParsedIntentHits(ok!)[0]?.factKind, "inferred");

  assert.equal(needsIntentSlotLlmFill({ text: "신혼여행" }), false);
  assert.equal(parseIntents("신혼여행").length > 0, true);

  const miss = "아내랑 분위기 좋은 숙소로 떠나고 싶어";
  assert.equal(needsIntentSlotLlmFill({ text: miss }), true);
  assert.equal(parseIntents(miss).length, 0);

  const rulesOnly = compileIntentBlueprint({ text: miss });
  assert.equal(rulesOnly.intents.length, 0);

  const filled = await compileIntentBlueprintViaLlm(
    { text: miss },
    {
      callJson: async () =>
        JSON.stringify({
          library_ids: ["travel.couple", "mood.indie"],
          confidence: 0.8,
          missing_information: ["destination"],
        }),
    },
  );
  assert.equal(filled.source, "llm");
  assert.ok(filled.blueprint.intents.some((i) => i.libraryId === "travel.couple"));
  assert.ok(filled.blueprint.intents.some((i) => i.libraryId === "mood.indie"));
  assert.ok(filled.blueprint.missing_information.includes("destination"));

  const travel = projectIntentBlueprintToTravel(filled.blueprint);
  assert.equal(travel.companionMode?.value, "couple");
  assert.equal(travel.lodgingPriority?.value, "aesthetic");
  assert.equal(travel.foodBias?.value, "cafe");

  memory.clear();
  resetEventCandidatesForTests([]);
  const filled2 = await compileIntentBlueprintViaLlm(
    { text: miss },
    {
      callJson: async () =>
        JSON.stringify({
          library_ids: ["travel.couple"],
          confidence: 0.8,
        }),
    },
  );
  const event = ensureTripContextEvent({
    message: miss,
    profile: "leisure_travel",
  });
  const stamped = {
    ...event,
    metadata: {
      ...(event.metadata ?? {}),
      [INTENT_BLUEPRINT_META_KEY]: filled2.blueprint,
    },
  };
  assert.ok(readIntentBlueprintFromEvent(stamped));
  const brain = buildTravelBrainState(stamped);
  assert.equal(brain.slots.companion_mode.value, "couple");
  assert.equal(brain.slots.lodging_priority.value, "aesthetic");

  const failed = await compileIntentBlueprintViaLlm(
    { text: miss },
    {
      callJson: async () => null,
    },
  );
  assert.equal(failed.source, "none");
  assert.equal(failed.blueprint.intents.length, 0);

  console.log("✓ intent slot llm fill (miss → closed blueprint)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
