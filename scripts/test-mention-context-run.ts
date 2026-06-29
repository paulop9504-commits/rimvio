#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { buildArchiveContextKey } from "../lib/archive/build-archived-event";
import { resolveMentionContractPlan } from "../lib/context-run/plan-mention-contract";
import { parseActionMention } from "../lib/event-kernel/action-contracts/parse-action-mention";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

const mealPlan = resolveMentionContractPlan("@식사 강남역 맛집");
assert.ok(mealPlan, "meal mention should plan mention_contract");
assert.equal(mealPlan?.kind, "mention_contract");
assert.equal(mealPlan?.mentionFeatureId, "meal");
assert.equal(mealPlan?.contractAction, "MEAL_RECOMMENDATION");
assert.equal(mealPlan?.mentionContextKey, "event.food.mention:meal");

const navPlan = resolveMentionContractPlan("@네비 강남역");
assert.equal(navPlan, null, "URL-backed navigate stays external_url path");

const reminderPlan = resolveMentionContractPlan("@알림");
assert.ok(reminderPlan, "confirm-only mention should plan mention_contract");
assert.equal(reminderPlan?.needsConfirmOnly, true);

const mention = parseActionMention("@식사 강남역 맛집");
assert.ok(mention);

const stamped = commitEventUpsert({
  id: "ec-mention-meal-test",
  title: "강남역 맛집",
  category: mention.feature.category,
  source: "message",
  lifecycle: "draft",
  confidence: 0.8,
  metadata: {
    sourceRef: mention.feature.sourceRef,
    mentionFeatureId: mention.feature.featureId,
    mentionContextKey: mention.contextKey,
  },
});

assert.equal(buildArchiveContextKey(stamped), mention.contextKey);

console.log("test-mention-context-run: ok");
