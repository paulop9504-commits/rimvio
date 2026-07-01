#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { composeDraftHasValues } from "../lib/portal/compose-draft/draft-utils";
import { classifyComposeIntent } from "../lib/portal/compose-intent/classify-compose-intent";
import { detectPortalIntentFromText } from "../lib/portal/detect-portal-intent-from-text";
import { resetPortalComposeRunStoreForTests } from "../lib/portal/portal-compose-run-store";
import { resolvePortalComposeRunTurn } from "../lib/portal/resolve-portal-compose-run-turn";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

async function main() {
  resetPortalComposeRunStoreForTests();

  assert.ok(detectPortalIntentFromText("핸드폰 좀 오래돼서"), "ambient interest routes to portal");

  const vague = await classifyComposeIntent({
    history: [],
    newMessage: "핸드폰 좀 오래돼서",
    previousStage: null,
  });
  assert.equal(vague.stage, "soft_signal");

  const explicit = await classifyComposeIntent({
    history: [],
    newMessage: "핸드폰 팔고 싶어요",
    previousStage: null,
  });
  assert.equal(explicit.stage, "confirmed");

  const affirm = await classifyComposeIntent({
    history: [{ role: "assistant", text: "올려볼래요?" }],
    newMessage: "좋아요 올려볼게요",
    previousStage: { stage: "soft_signal", possibleIntent: "sell_item" },
  });
  assert.equal(affirm.stage, "confirmed");

  const pillAfterSoft = await classifyComposeIntent({
    history: [{ role: "user", text: "핸드폰 판매" }],
    newMessage: "70만원, 사용감 있음",
    previousStage: { stage: "soft_signal", possibleIntent: "sell_item" },
  });
  assert.equal(pillAfterSoft.stage, "confirmed");

  const event = commitEventUpsert({
    id: "ec-intent-spectrum",
    title: "테스트",
    category: "custom",
    source: "message",
    lifecycle: "draft",
    confidence: 0.8,
  });

  const converse = await resolvePortalComposeRunTurn({
    graphId: "composer:vague-phone",
    intentId: "offer",
    categoryId: "used_goods",
    message: "핸드폰 좀 오래돼서",
    eventId: event.id,
  });
  assert.equal(converse.kind, "compose_converse");
  if (converse.kind === "compose_converse") {
    assert.equal(converse.intentStage.stage, "soft_signal");
    assert.equal(composeDraftHasValues(converse.state.composeDraft), false);
    assert.equal(converse.state.composeSchemaId, null);
    assert.equal(converse.state.status, "conversing");
  }

  const confirmed = await resolvePortalComposeRunTurn({
    graphId: "composer:explicit-sell",
    intentId: "offer",
    categoryId: "used_goods",
    message: "물건 팔고 싶어",
    eventId: event.id,
  });
  assert.equal(confirmed.kind, "clarify");
  if (confirmed.kind === "clarify") {
    assert.equal(confirmed.state.intentStage?.stage, "confirmed");
    assert.equal(confirmed.state.composeSchemaId, "sell_item");
    assert.equal(confirmed.state.status, "waiting_slot");
    assert.ok(confirmed.questionKo.trim().length > 0);
  }

  console.log("test-compose-intent-spectrum: ok");
}

void main();
