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

  // Marketplace NL → Context continuum (ADR-032); together/join stay portal.
  assert.equal(planFor("아이폰 팔고 싶어").kind, "workspace_intent_continuum");
  assert.equal(planFor("주말 스터디 같이해요", "capture_sheet").kind, "portal_compose_run");
  assert.equal(planFor("호텔 추천해줘").kind, "graph_command");

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
    assert.equal(intentOnly.state.macroStage, "slot_fill");
    assert.equal(intentOnly.state.descriptionStatus, "idle");
    assert.equal(intentOnly.state.descriptionDraftKo ?? null, null);
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

  const categoryTransition = await resolvePortalComposeRunTurn({
    graphId: "composer:category-transition",
    intentId: "offer",
    categoryId: "used_goods",
    message: "아이폰15프로",
    answerText: "맞아요",
    eventId: event.id,
    resumeState: {
      graphId: "composer:category-transition",
      intentId: "offer",
      categoryId: "used_goods",
      composeSeed: "아이폰15프로",
      accumulatedText: "아이폰15프로",
      eventId: event.id,
      pendingSlotId: "__category__",
      askedCount: 1,
      status: "waiting_slot",
      macroStage: "category_scope",
      intentStage: { stage: "confirmed", resourceType: "sell_item" },
      marketRole: "listing",
      composeSchemaId: "sell_item",
      composeDraft: { productName: "아이폰15프로" },
      productCategoryStatus: "proposed",
      proposedCategoryId: "smartphone",
      pendingClarifyKind: "category_confirm",
      updatedAt: new Date().toISOString(),
    },
  });
  assert.equal(categoryTransition.kind, "clarify");
  if (categoryTransition.kind === "clarify") {
    assert.match(categoryTransition.questionKo, /하나씩 맞출게요/u);
    assert.match(categoryTransition.questionKo, /용량|상태|가격|거래/u);
    assert.equal(categoryTransition.state.macroStage, "slot_fill");
  }

  const descriptionReady = await resolvePortalComposeRunTurn({
    graphId: "composer:description-ready",
    intentId: "offer",
    categoryId: "used_goods",
    message: "아이폰 15 판매",
    eventId: event.id,
    resumeState: {
      graphId: "composer:description-ready",
      intentId: "offer",
      categoryId: "used_goods",
      composeSeed: "아이폰 15 판매",
      accumulatedText: "아이폰 15 판매",
      eventId: event.id,
      pendingSlotId: null,
      askedCount: 4,
      status: "ready",
      macroStage: "slot_fill",
      intentStage: { stage: "confirmed", resourceType: "sell_item" },
      marketRole: "listing",
      composeSchemaId: "sell_item",
      composeDraft: {
        productName: "아이폰 15",
        priceKrw: 700_000,
        condition: "상태 좋음",
        placeLabel: "계산동",
        photos: ["local:1"],
      },
      productCategoryId: "smartphone",
      productCategoryStatus: "confirmed",
      proposedCategoryId: null,
      slotExtras: { storage: "256GB" },
      skippedSlots: [],
      detailSlotFill: false,
      taxonomyStatus: "confirmed",
      taxonomyLeafId: "digital.phone.smartphone",
      taxonomyCandidateIds: ["digital.phone.smartphone"],
      marketCategoryId: "market.phone",
      descriptionStatus: "idle",
      descriptionDraftKo: null,
      updatedAt: new Date().toISOString(),
    },
  });
  assert.equal(descriptionReady.kind, "compose_draft");
  if (descriptionReady.kind === "compose_draft") {
    assert.ok(
      descriptionReady.state.macroStage === "description_ready" ||
        descriptionReady.state.macroStage === "publish_review",
    );
    assert.ok(
      descriptionReady.state.descriptionStatus === "generated" ||
        descriptionReady.state.descriptionStatus === "edited",
    );
    if (descriptionReady.state.descriptionDraftKo) {
      assert.match(descriptionReady.state.descriptionDraftKo, /아이폰 15/u);
      assert.match(descriptionReady.state.descriptionDraftKo, /700,000원|70만원/u);
    }
  }

  const publishReview = await resolvePortalComposeRunTurn({
    graphId: "composer:description-ready",
    intentId: "offer",
    categoryId: "used_goods",
    message: "아이폰 15 판매",
    answerText: "박스 없이 본체만 있어요",
    eventId: event.id,
    resumeState: {
      ...(descriptionReady.kind === "compose_draft" ? descriptionReady.state : null)!,
      status: "waiting_slot",
      detailSlotFill: true,
      pendingClarifyKind: "slot",
      pendingSlotId: "note",
    },
  });
  assert.equal(publishReview.kind, "compose_draft");
  if (publishReview.kind === "compose_draft") {
    assert.equal(publishReview.state.macroStage, "publish_review");
    assert.equal(publishReview.state.descriptionStatus, "edited");
    assert.ok(
      publishReview.state.composeDraft?.note?.includes("박스 없이 본체만"),
      "manual note should land in publish review draft",
    );
    assert.equal(
      publishReview.state.descriptionDraftKo,
      descriptionReady.kind === "compose_draft" ? descriptionReady.state.descriptionDraftKo : null,
    );
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
