#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { mergeComposeDraftIfEmpty } from "../lib/portal/compose-draft/draft-utils";
import { extractDraftSlotsRulesOnly } from "../lib/portal/compose-draft/extract-draft-slots";
import { prefillComposeDraftFromTurn } from "../lib/portal/compose-draft/prefill-compose-draft-from-turn";
import { runComposeSlotFillTurn } from "../lib/portal/compose-draft/run-compose-slot-fill";

async function main() {
  const rules = extractDraftSlotsRulesOnly("아이폰15프로 80만원 배터리 92% 대전 둔산동");
  assert.ok(rules.productName?.includes("아이폰"));
  assert.equal(rules.priceKrw, 800_000);
  assert.ok(rules.condition?.includes("배터리"));
  assert.ok(rules.placeLabel?.includes("대전"));

  const merged = mergeComposeDraftIfEmpty({}, rules);
  assert.equal(merged.priceKrw, 800_000);

  const prefilled = await prefillComposeDraftFromTurn({
    schemaId: "sell_item",
    graphId: "composer:prefill",
    accumulatedText: "아이폰15프로 80만원 배터리 92% 대전 둔산동",
    incoming: "아이폰15프로 80만원 배터리 92% 대전 둔산동",
    draft: {},
    slotExtras: {},
    pendingClarifyKind: "slot",
  });
  assert.equal(prefilled.draft.priceKrw, 800_000);
  assert.ok(prefilled.draft.productName?.includes("아이폰"));

  const multi = await runComposeSlotFillTurn({
    resumeState: {
      graphId: "composer:multi",
      intentId: "offer",
      categoryId: "used_goods",
      composeSeed: "아이폰",
      accumulatedText: "아이폰15프로 80만원 배터리 92% 대전 둔산동",
      eventId: "evt-multi",
      pendingSlotId: null,
      pendingClarifyKind: "slot",
      askedCount: 0,
      status: "drafting",
      composeSchemaId: "sell_item",
      composeDraft: {},
      productCategoryId: "smartphone",
      productCategoryStatus: "confirmed",
      updatedAt: new Date().toISOString(),
    },
    message: "아이폰15프로 80만원 배터리 92% 대전 둔산동",
    schemaId: "sell_item",
    graphId: "composer:multi",
    accumulatedText: "아이폰15프로 80만원 배터리 92% 대전 둔산동",
  });
  assert.equal(multi.kind, "slot_review", `expected review, got ${multi.kind}`);
  if (multi.kind === "slot_review") {
    assert.equal(multi.canPublish, true);
    assert.equal(multi.draft.priceKrw, 800_000);
  }

  const chipOnly = await prefillComposeDraftFromTurn({
    schemaId: "sell_item",
    graphId: "composer:chip",
    accumulatedText: "아이폰15프로",
    incoming: "256GB",
    draft: { productName: "아이폰15프로" },
    slotExtras: {},
    pendingClarifyKind: "slot",
    answerText: "256GB",
  });
  assert.equal(chipOnly.slotExtras.storage, "256GB");

  console.log("test-prefill-compose-draft: ok");
}

void main();
