#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { splitMainAuxActions } from "../lib/action-decision/split-main-aux-actions";
import { buildArchiveContextKey } from "../lib/archive/build-archived-event";
import { resetLearningRollupForTests } from "../lib/archive/learning-rollup-store";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

const event = commitEventUpsert({
  id: "ec-spine-meal-test",
  title: "강남역 맛집",
  category: "food",
  source: "message",
  lifecycle: "scheduled",
  datetime: new Date(Date.now() + 45 * 60_000).toISOString(),
  confidence: 0.82,
  metadata: {
    sourceRef: "mention:meal",
    mentionFeatureId: "meal",
    mentionContextKey: "event.food.mention:meal",
  },
});

const contextKey = buildArchiveContextKey(event);
assert.equal(contextKey, "event.food.mention:meal");

resetLearningRollupForTests([
  {
    contextKey,
    actionKey: "nav",
    label: "길찾기",
    shown: 10,
    clicked: 8,
    executed: 7,
    dismissed: 0,
    rates: { clickRate: 0.8, executeRate: 0.7, dismissRate: 0 },
    scoreDelta: 1,
    updatedAt: new Date().toISOString(),
  },
]);

const candidates = [
  { id: "taxi", label: "카카오T 호출", action_type: "TAXI" },
  { id: "nav", label: "길찾기", action_type: "NAVIGATE" },
];

const withoutRollup = splitMainAuxActions({
  candidates,
  minutes_until_event: 25,
});

const withRollup = splitMainAuxActions({
  candidates,
  minutes_until_event: 25,
  ranking_context_key: contextKey,
});

assert.equal(withoutRollup.primary_action?.action_id, "taxi");
assert.equal(
  withRollup.primary_action?.action_id,
  "nav",
  "mention-stamped contextKey should drive rollup MAIN",
);

console.log("test-spine-mention-prep-e2e: ok");
