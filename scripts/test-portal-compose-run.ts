#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { bindSituation } from "../lib/context-run/bind-situation";
import { planContextRun } from "../lib/context-run/plan-context-run";
import type { ContextRunIngress } from "../lib/context-run/ingress-types";
import { composeDraftHasValues } from "../lib/portal/compose-draft/draft-utils";
import { detectPortalIntentFromText } from "../lib/portal/detect-portal-intent-from-text";
import { detectComposeSchemaFromText } from "../lib/portal/compose-draft/schema-registry";
import {
  resetPortalComposeRunStoreForTests,
  writePortalComposeRunState,
} from "../lib/portal/portal-compose-run-store";
import { resolvePortalComposeRunTurn } from "../lib/portal/resolve-portal-compose-run-turn";
import { commitEventUpsert } from "../lib/source-of-truth/commit-truth";

function planFor(text: string, surface: "composer" | "capture_sheet" = "composer") {
  const ingress: ContextRunIngress = {
    kind: "text",
    text,
    surface,
    layerMode: "personal",
    contextEventId: null,
  };
  return planContextRun(bindSituation(ingress));
}

async function main() {
  resetPortalComposeRunStoreForTests();

  const offer = detectPortalIntentFromText("동네에 에어팟 내놓고 싶어");
  assert.ok(offer);
  assert.equal(offer?.intentId, "offer");

  const seek = detectPortalIntentFromText("맥북 구해요");
  assert.equal(seek?.intentId, "seek");

  const together = detectPortalIntentFromText("주말에 러닝 같이 할 사람");
  assert.equal(together?.intentId, "together");
  assert.equal(together?.categoryId, "sport");

  const join = detectPortalIntentFromText("이번 주말 공연 참여하고 싶어");
  assert.equal(join?.intentId, "join");

  assert.equal(detectComposeSchemaFromText("아이패드 팔고 싶어"), "sell_item");
  assert.equal(detectComposeSchemaFromText("방 좀 놓으려고"), "rent_property");

  assert.equal(planFor("아이폰 팔고 싶어").kind, "portal_compose_run");
  assert.equal(planFor("주말 스터디 같이해요", "capture_sheet").kind, "portal_compose_run");
  assert.equal(planFor("호텔 추천해줘").kind, "experience_run");

  const event = commitEventUpsert({
    id: "ec-portal-run-test",
    title: "에어팟 내놓기",
    category: "custom",
    source: "message",
    lifecycle: "draft",
    confidence: 0.8,
  });

  const intentOnly = await resolvePortalComposeRunTurn({
    graphId: "composer:test",
    intentId: "offer",
    categoryId: "used_goods",
    message: "물건 팔고 싶어",
    eventId: event.id,
  });
  assert.equal(intentOnly.kind, "clarify");
  if (intentOnly.kind === "clarify") {
    assert.equal(intentOnly.slotId, "productName");
  }

  const partialProduct = await resolvePortalComposeRunTurn({
    graphId: "composer:airpods",
    intentId: "offer",
    categoryId: "used_goods",
    message: "동네에 에어팟 내놓고 싶어",
    eventId: event.id,
  });
  assert.equal(partialProduct.kind, "clarify");

  const multiSlot = await resolvePortalComposeRunTurn({
    graphId: "composer:ipad",
    intentId: "offer",
    categoryId: "used_goods",
    message: "아이패드 프로 11인치 1년 쓴 거 60만원에 팔려고",
    eventId: event.id,
  });
  assert.ok(
    multiSlot.kind === "clarify" || multiSlot.kind === "compose_draft",
    `expected slot flow, got ${multiSlot.kind}`,
  );
  if (multiSlot.kind === "compose_draft") {
    assert.ok(multiSlot.draft.productName?.includes("아이패드"));
    assert.equal(multiSlot.canPublish, false);
  }

  const social = await resolvePortalComposeRunTurn({
    graphId: "composer:social",
    intentId: "together",
    categoryId: "sport",
    message: "러닝 같이",
    eventId: event.id,
  });
  assert.equal(social.kind, "clarify");

  writePortalComposeRunState({
    graphId: "composer:핸드폰 판매",
    intentId: "offer",
    categoryId: "used_goods",
    composeSeed: "핸드폰 판매",
    accumulatedText: "핸드폰 판매",
    eventId: event.id,
    pendingSlotId: null,
    askedCount: 0,
    status: "drafting",
    composeSchemaId: "sell_item",
    composeDraft: {},
    updatedAt: new Date().toISOString(),
  });

  const resumePlan = planFor("아이폰 15 프로 80만원", "capture_sheet");
  assert.equal(resumePlan.kind, "portal_compose_run");
  assert.equal(resumePlan.resumePortalRun, true);
  assert.equal(resumePlan.graphId, "composer:핸드폰 판매");

  console.log("test-portal-compose-run: ok");
}

void main();
