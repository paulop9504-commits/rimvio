import assert from "node:assert/strict";
import { buildSlotReviewAssistantKo } from "../lib/portal/compose-draft/build-slot-review-reply";
import { copy } from "../lib/copy/human-ko";

function main() {
  const needsMedia = buildSlotReviewAssistantKo("sell_item", {
    productName: "아이폰15",
    priceKrw: 700_000,
    condition: "상태 좋음",
    placeLabel: "계산동",
  });
  assert.equal(needsMedia, copy.portal.slotReviewAskMedia);
  assert.match(needsMedia, /＋/u);
  assert.match(needsMedia, /사진/u);

  const needsNote = buildSlotReviewAssistantKo("sell_item", {
    productName: "아이폰15",
    priceKrw: 700_000,
    condition: "상태 좋음",
    placeLabel: "계산동",
    photos: ["local:1"],
    note: "",
  });
  assert.equal(needsNote, copy.portal.slotReviewAskDescription);

  const ready = buildSlotReviewAssistantKo("sell_item", {
    productName: "아이폰15",
    priceKrw: 700_000,
    condition: "상태 좋음",
    placeLabel: "계산동",
    photos: ["local:1"],
    note: "박스 있음",
  });
  assert.equal(ready, copy.portal.slotReviewConfirmPublish);
  assert.match(ready, /한 줄로 내놓기/u);

  console.log("test-build-slot-review-reply: ok");
}

main();
