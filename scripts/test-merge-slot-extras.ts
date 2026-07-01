import assert from "node:assert/strict";
import { mergeSlotExtrasIntoDraft } from "../lib/portal/compose-draft/parse-slot-answer";
import { prefillComposeDraftFromTurn } from "../lib/portal/compose-draft/prefill-compose-draft-from-turn";

async function main() {
  const once = mergeSlotExtrasIntoDraft(
    { note: null },
    { storage: "256GB", cpuRam: "M2 · 16GB", sizeLabel: "M" },
  );
  assert.match(once.note ?? "", /용량 256GB/u);
  assert.match(once.note ?? "", /사양 M2/u);
  assert.match(once.note ?? "", /사이즈 M/u);

  const twice = mergeSlotExtrasIntoDraft(once, {
    storage: "256GB",
    cpuRam: "M2 · 16GB",
    sizeLabel: "M",
  });
  const extraLineCount = (twice.note ?? "").split("용량 256GB").length - 1;
  assert.equal(extraLineCount, 1, "should not duplicate merged extras");

  const prefilled = await prefillComposeDraftFromTurn({
    schemaId: "sell_item",
    graphId: "composer:memo",
    accumulatedText: "아이폰15 팔고싶어",
    incoming: "아이폰15 팔고싶어",
    draft: { productName: "아이폰15" },
    slotExtras: {},
    pendingClarifyKind: "slot",
    pendingSlotId: "priceKrw",
    answerText: null,
  });
  assert.equal(prefilled.slotExtras.storage, undefined);
  assert.equal(prefilled.slotExtras.cpuRam, undefined);
  assert.equal(prefilled.slotExtras.sizeLabel, undefined);

  const multi = await prefillComposeDraftFromTurn({
    schemaId: "sell_item",
    graphId: "composer:multi",
    accumulatedText: "아이폰15 70만원 상태 좋아 계산동",
    incoming: "상태 좋음",
    draft: { productName: "아이폰15" },
    slotExtras: {},
    pendingClarifyKind: "slot",
    pendingSlotId: "condition",
    answerText: "상태 좋음",
  });
  assert.equal(multi.draft.priceKrw, 700_000);
  assert.equal(multi.draft.condition, "상태 좋음");

  console.log("test-merge-slot-extras: ok");
}

void main();
