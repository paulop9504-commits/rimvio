#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { DEPARTURE_HUB_AIRPORT_IATA_META_KEY } from "../lib/globe/departure-hub-airports";
import { resolvePrimaryHubServiceRow } from "../lib/globe/context-hub/resolve-primary-hub-service";
import { listContextHubServicesForEvent } from "../lib/globe/context-hub/context-hub-service-catalog";
import { resetLearningRollupForTests } from "../lib/archive/learning-rollup-store";
import {
  FEATURE_ACTION_CATEGORY,
  projectSemanticTriples,
  resolveActionCategory,
  resolveSemanticMainHint,
  resolveSemanticMainHintForEvent,
} from "../lib/semantic";
import { listMentionFeatures } from "../lib/event-kernel/action-contracts/mention-feature-registry";

function travelEvent(overrides: Partial<EventCandidate> = {}): EventCandidate {
  return {
    id: "ec-jeju-semantic",
    title: "제주 여행",
    category: "travel",
    place: "제주",
    source: "message",
    lifecycle: "scheduled",
    confidence: 0.85,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: { planPeerDisplayName: "민수" },
    ...overrides,
  };
}

// --- 3) registry ↔ ActionCategory full coverage ---
for (const feature of listMentionFeatures()) {
  assert.ok(
    FEATURE_ACTION_CATEGORY[feature.featureId],
    `missing category for ${feature.featureId}`,
  );
  assert.ok(
    ["transaction", "movement", "planning", "communication"].includes(
      resolveActionCategory(feature.featureId),
    ),
  );
}

resetLearningRollupForTests([]);

// --- travel ---
const event = travelEvent();
resetEventCandidatesForTests([
  event,
  {
    id: "hub-gimpo",
    title: "김포 출발",
    category: "travel",
    place: "GMP",
    source: "message",
    lifecycle: "scheduled",
    confidence: 0.9,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      contextHubKind: "departure_airport",
      [DEPARTURE_HUB_AIRPORT_IATA_META_KEY]: "GMP",
    },
  },
]);

const linkedTravel = {
  ...event,
  metadata: { ...event.metadata, contextHubIds: ["hub-gimpo"] },
};
const hubBundle = listContextHubServicesForEvent(linkedTravel);
assert.ok(hubBundle, "travel context should expose hub services");

const travelTriples = projectSemanticTriples({
  focusEvent: linkedTravel,
  hubServices: hubBundle,
});
assert.ok(
  travelTriples.some((row) => row.predicate === "requires_hub" && row.objectId === "hub:flight"),
);
assert.ok(
  travelTriples.some((row) => row.predicate === "part_of" && row.subjectId.includes("민수")),
);

const travelHint = resolveSemanticMainHint({
  semanticTriples: travelTriples,
  hubServices: hubBundle!.services,
  focusEvent: linkedTravel,
});
assert.ok(travelHint);
assert.equal(travelHint!.hubServiceId, "lodging");

const primary = resolvePrimaryHubServiceRow(hubBundle!.services, linkedTravel);
assert.equal(primary?.serviceId, "lodging");

// --- 1) food playbook ---
const foodEvent: EventCandidate = {
  id: "ec-food",
  title: "홍대 저녁",
  category: "food",
  place: "홍대",
  source: "message",
  lifecycle: "scheduled",
  confidence: 0.8,
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const foodTriples = projectSemanticTriples({ focusEvent: foodEvent });
assert.ok(
  foodTriples.some(
    (row) => row.predicate === "has_intent" && row.objectId === "action:meal",
  ),
  "food context suggests meal first",
);
assert.ok(foodTriples.some((row) => row.objectId === "class:food"));

const foodHint = resolveSemanticMainHint({
  semanticTriples: foodTriples,
  hubServices: [],
  focusEvent: foodEvent,
});
assert.equal(foodHint?.hubServiceId, "meal");

// --- 1) schedule playbook ---
const scheduleEvent: EventCandidate = {
  id: "ec-schedule",
  title: "팀 미팅",
  category: "schedule",
  datetime: "2026-06-20T14:00:00.000Z",
  source: "message",
  lifecycle: "scheduled",
  confidence: 0.8,
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const scheduleTriples = projectSemanticTriples({ focusEvent: scheduleEvent });
assert.ok(
  scheduleTriples.some(
    (row) => row.predicate === "has_intent" && row.objectId === "action:schedule",
  ),
);

// --- 2) rollup triggers ---
resetLearningRollupForTests([
  {
    contextKey: "event.food.mention:meal",
    actionKey: "meal",
    label: "맛집",
    shown: 2,
    clicked: 2,
    executed: 1,
    dismissed: 0,
    rates: { clickRate: 1, executeRate: 0.5, dismissRate: 0 },
    scoreDelta: 0.4,
    updatedAt: new Date().toISOString(),
  },
]);

const foodWithRollup = projectSemanticTriples({
  focusEvent: foodEvent,
  rollupEntries: [
    {
      contextKey: "event.food.mention:meal",
      actionKey: "meal",
      label: "맛집",
      shown: 2,
      clicked: 2,
      executed: 1,
      dismissed: 0,
      rates: { clickRate: 1, executeRate: 0.5, dismissRate: 0 },
      scoreDelta: 0.4,
      updatedAt: new Date().toISOString(),
    },
  ],
});
assert.ok(
  foodWithRollup.some(
    (row) =>
      row.predicate === "triggers" &&
      row.subjectId === "action:meal" &&
      row.objectId === "action:navigate",
  ),
  "meal executed should trigger navigate",
);

const rollupHint = resolveSemanticMainHint({
  semanticTriples: foodWithRollup,
  hubServices: [],
  focusEvent: foodEvent,
  rollupEntries: [
    {
      contextKey: "event.food.mention:meal",
      actionKey: "meal",
      label: "맛집",
      shown: 2,
      clicked: 2,
      executed: 1,
      dismissed: 0,
      rates: { clickRate: 1, executeRate: 0.5, dismissRate: 0 },
      scoreDelta: 0.4,
      updatedAt: new Date().toISOString(),
    },
  ],
});
assert.equal(rollupHint?.hubServiceId, "navigate");
assert.ok(rollupHint?.reasonCode.includes("rollup"));

const hintForEvent = resolveSemanticMainHintForEvent(linkedTravel);
assert.equal(hintForEvent?.labelKo, "숙소");

console.log("test-semantic-projection: ok");
