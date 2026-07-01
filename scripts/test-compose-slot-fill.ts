import assert from "node:assert/strict";
import { classifyProductCategory } from "../lib/portal/compose-draft/product-category-registry";
import {
  parseCategoryConfirmResponse,
  parseCategoryPickResponse,
} from "../lib/portal/compose-draft/parse-category-response";
import { parseSlotAnswer } from "../lib/portal/compose-draft/parse-slot-answer";
import { parseComposePriceKrw } from "../lib/portal/compose-draft/parse-compose-price-krw";
import { runComposeSlotFillTurn } from "../lib/portal/compose-draft/run-compose-slot-fill";

async function main() {
  assert.equal(classifyProductCategory("아이폰15프로"), "smartphone");
  assert.equal(classifyProductCategory("맥북 프로 m2"), "laptop");
  assert.equal(parseCategoryConfirmResponse("맞아요"), "yes");
  assert.equal(parseCategoryConfirmResponse("아니요"), "no");
  assert.equal(parseCategoryPickResponse("스마트폰"), "smartphone");

  const first = await runComposeSlotFillTurn({
    resumeState: null,
    message: "핸드폰 팔꺼야",
    schemaId: "sell_item",
    graphId: "composer:first",
    accumulatedText: "핸드폰 팔꺼야",
  });
  assert.equal(first.kind, "slot_question");
  if (first.kind === "slot_question") {
    assert.equal(first.slotId, "productName");
  }

  const withProduct = await runComposeSlotFillTurn({
    resumeState: {
      graphId: "composer:test",
      intentId: "offer",
      categoryId: "used_goods",
      composeSeed: "에어팟",
      accumulatedText: "동네에 에어팟 내놓고 싶어",
      eventId: "evt-1",
      pendingSlotId: null,
      askedCount: 0,
      status: "drafting",
      composeSchemaId: "sell_item",
      composeDraft: { productName: "에어팟" },
      productCategoryId: "generic",
      productCategoryStatus: "confirmed",
      updatedAt: new Date().toISOString(),
    },
    message: "동네에 에어팟 내놓고 싶어",
    schemaId: "sell_item",
    graphId: "composer:test",
    accumulatedText: "동네에 에어팟 내놓고 싶어",
  });
  assert.equal(withProduct.kind, "slot_question");
  if (withProduct.kind === "slot_question") {
    assert.notEqual(withProduct.slotId, "productName");
  }

  const priceAnswer = parseSlotAnswer("priceKrw", "80만원");
  assert.equal(priceAnswer.draft.priceKrw, 800_000);

  assert.equal(parseComposePriceKrw("700000").ok, true);
  assert.equal(parseComposePriceKrw("백만원").ok, true);
  assert.equal(parseComposePriceKrw("70만언").ok, true);

  const barePrice = await runComposeSlotFillTurn({
    resumeState: {
      graphId: "composer:price-bare",
      intentId: "offer",
      categoryId: "used_goods",
      composeSeed: "아이폰",
      accumulatedText: "아이폰15프로",
      eventId: "evt-price",
      pendingSlotId: "priceKrw",
      askedCount: 1,
      status: "waiting_slot",
      composeSchemaId: "sell_item",
      composeDraft: {
        productName: "아이폰15프로",
        condition: "좋음",
        placeLabel: "서울",
      },
      productCategoryId: "smartphone",
      productCategoryStatus: "confirmed",
      pendingClarifyKind: "slot",
      updatedAt: new Date().toISOString(),
    },
    message: "700000",
    answerText: "700000",
    schemaId: "sell_item",
    graphId: "composer:price-bare",
    accumulatedText: "아이폰15프로",
  });
  assert.equal(barePrice.kind, "slot_review");
  if (barePrice.kind === "slot_review") {
    assert.equal(barePrice.draft.priceKrw, 700_000);
  }

  const shorthandSeven = await runComposeSlotFillTurn({
    resumeState: {
      graphId: "composer:price-7",
      intentId: "offer",
      categoryId: "used_goods",
      composeSeed: "아이폰",
      accumulatedText: "아이폰15프로",
      eventId: "evt-7",
      pendingSlotId: "priceKrw",
      askedCount: 1,
      status: "waiting_slot",
      composeSchemaId: "sell_item",
      composeDraft: {
        productName: "아이폰15프로",
        condition: "좋음",
        placeLabel: "서울",
      },
      productCategoryId: "smartphone",
      productCategoryStatus: "confirmed",
      pendingClarifyKind: "slot",
      updatedAt: new Date().toISOString(),
    },
    message: "7",
    answerText: "7",
    schemaId: "sell_item",
    graphId: "composer:price-7",
    accumulatedText: "아이폰15프로",
  });
  assert.equal(shorthandSeven.kind, "slot_review");
  if (shorthandSeven.kind === "slot_review") {
    assert.equal(shorthandSeven.draft.priceKrw, 70_000);
  }

  const shorthandPrice = await runComposeSlotFillTurn({
    resumeState: {
      graphId: "composer:price-70",
      intentId: "offer",
      categoryId: "used_goods",
      composeSeed: "아이폰",
      accumulatedText: "아이폰15프로",
      eventId: "evt-70",
      pendingSlotId: "priceKrw",
      askedCount: 1,
      status: "waiting_slot",
      composeSchemaId: "sell_item",
      composeDraft: {
        productName: "아이폰15프로",
        condition: "좋음",
        placeLabel: "서울",
      },
      productCategoryId: "smartphone",
      productCategoryStatus: "confirmed",
      pendingClarifyKind: "slot",
      updatedAt: new Date().toISOString(),
    },
    message: "70",
    answerText: "70",
    schemaId: "sell_item",
    graphId: "composer:price-70",
    accumulatedText: "아이폰15프로",
  });
  assert.equal(shorthandPrice.kind, "slot_review");
  if (shorthandPrice.kind === "slot_review") {
    assert.equal(shorthandPrice.draft.priceKrw, 700_000);
  }

  const stepPrice = await runComposeSlotFillTurn({
    resumeState: {
      graphId: "composer:iphone",
      intentId: "offer",
      categoryId: "used_goods",
      composeSeed: "아이폰",
      accumulatedText: "아이폰15프로",
      eventId: "evt-1",
      pendingSlotId: "priceKrw",
      askedCount: 2,
      status: "waiting_slot",
      composeSchemaId: "sell_item",
      composeDraft: {
        productName: "아이폰15프로",
        condition: "배터리 92%",
        placeLabel: "대전 둔산동",
      },
      productCategoryId: "smartphone",
      productCategoryStatus: "confirmed",
      pendingClarifyKind: "slot",
      updatedAt: new Date().toISOString(),
    },
    message: "80만원",
    answerText: "80만원",
    schemaId: "sell_item",
    graphId: "composer:iphone",
    accumulatedText: "아이폰15프로",
  });
  assert.equal(stepPrice.kind, "slot_review");
  if (stepPrice.kind === "slot_review") {
    assert.equal(stepPrice.draft.priceKrw, 800_000);
    assert.equal(stepPrice.canPublish, true);
  }

  const categoryFlow = await runComposeSlotFillTurn({
    resumeState: {
      graphId: "composer:iphone-cat",
      intentId: "offer",
      categoryId: "used_goods",
      composeSeed: "아이폰15프로",
      accumulatedText: "아이폰15프로",
      eventId: "evt-1",
      pendingSlotId: "__category__",
      pendingClarifyKind: "category_confirm",
      proposedCategoryId: "smartphone",
      productCategoryStatus: "proposed",
      askedCount: 1,
      status: "waiting_slot",
      composeSchemaId: "sell_item",
      composeDraft: { productName: "아이폰15프로" },
      updatedAt: new Date().toISOString(),
    },
    message: "맞아요",
    answerText: "맞아요",
    schemaId: "sell_item",
    graphId: "composer:iphone-cat",
    accumulatedText: "아이폰15프로",
  });
  assert.equal(categoryFlow.kind, "slot_question");
  if (categoryFlow.kind === "slot_question") {
    assert.equal(categoryFlow.productCategoryStatus, "confirmed");
  }

  const oneTurnCombo = await runComposeSlotFillTurn({
    resumeState: {
      graphId: "composer:combo",
      intentId: "offer",
      categoryId: "used_goods",
      composeSeed: "아이폰15",
      accumulatedText: "아이폰15프로",
      eventId: "evt-combo",
      pendingSlotId: "priceKrw",
      askedCount: 2,
      status: "waiting_slot",
      composeSchemaId: "sell_item",
      composeDraft: {
        productName: "아이폰15프로",
        placeLabel: "서울",
      },
      productCategoryId: "smartphone",
      productCategoryStatus: "confirmed",
      pendingClarifyKind: "slot",
      updatedAt: new Date().toISOString(),
    },
    message: "70만원, 상태 사용감 있음",
    answerText: "70만원, 상태 사용감 있음",
    schemaId: "sell_item",
    graphId: "composer:combo",
    accumulatedText: "아이폰15프로",
  });
  assert.equal(oneTurnCombo.kind, "slot_review");
  if (oneTurnCombo.kind === "slot_review") {
    assert.equal(oneTurnCombo.draft.priceKrw, 700_000);
    assert.equal(oneTurnCombo.draft.condition, "사용감 있음");
    assert.equal(oneTurnCombo.canPublish, true);
  }

  const skipReask = await runComposeSlotFillTurn({
    resumeState: {
      graphId: "composer:skip",
      intentId: "offer",
      categoryId: "used_goods",
      composeSeed: "아이폰15",
      accumulatedText: "아이폰15 70만원 사용감 있음 강남역",
      eventId: "evt-skip",
      pendingSlotId: null,
      askedCount: 0,
      status: "drafting",
      composeSchemaId: "sell_item",
      composeDraft: {},
      productCategoryId: "smartphone",
      productCategoryStatus: "confirmed",
      updatedAt: new Date().toISOString(),
    },
    message: "아이폰15 70만원 사용감 있음 강남역",
    schemaId: "sell_item",
    graphId: "composer:skip",
    accumulatedText: "아이폰15 70만원 사용감 있음 강남역",
  });
  assert.equal(skipReask.kind, "slot_review");
  if (skipReask.kind === "slot_review") {
    assert.equal(skipReask.draft.priceKrw, 700_000);
    assert.equal(skipReask.draft.condition, "사용감 있음");
    assert.notEqual(skipReask.draft.productName, undefined);
  }

  console.log("test-compose-slot-fill: ok");
}

void main();
