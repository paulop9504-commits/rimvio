/**
 * Soft next-gap after Act — one-way Cursor-like continue.
 * Run: npx tsx scripts/test-soft-next-work-after-act.ts
 */

import assert from "node:assert/strict";
import {
  clearSoftNextWorkContinueMemory,
  offerSoftNextWorkAfterAct,
  recordHotelSelected,
} from "@/lib/workstream";
import { ensureWorkstream } from "@/lib/workstream/workstream-store";

const ctx = "ctx-soft-next-one-way";
ensureWorkstream(ctx);
clearSoftNextWorkContinueMemory(ctx);

// Empty workstream → lodging gap first (not eatery).
const openFirst = offerSoftNextWorkAfterAct({
  contextEventId: ctx,
  lastAct: "open_workspace",
  lastUtterance: "작업장 띄워",
  autoRun: false,
});
assert.equal(openFirst.continued, true);
assert.equal(openFirst.action?.id, "search_hotel");

clearSoftNextWorkContinueMemory(ctx);
recordHotelSelected({
  contextEventId: ctx,
  labelKo: "테스트 호텔",
  placeId: "maps:test-hotel",
});

const offer = offerSoftNextWorkAfterAct({
  contextEventId: ctx,
  lastAct: "search",
  lastUtterance: "호텔 찾아",
  autoRun: false,
});

assert.equal(offer.continued, true, "should soft-continue after hotel");
assert.equal(offer.action?.id, "search_eatery");
assert.ok(offer.enqueueUtterance?.includes("맛집"));
assert.ok(offer.replyKo?.includes("맛집"));

const again = offerSoftNextWorkAfterAct({
  contextEventId: ctx,
  lastAct: "search",
  lastUtterance: "호텔 찾아",
  autoRun: false,
});
assert.equal(again.continued, false, "same enqueue must not loop");

clearSoftNextWorkContinueMemory(ctx);
const sameDomain = offerSoftNextWorkAfterAct({
  contextEventId: ctx,
  lastAct: "search",
  lastUtterance: "맛집 찾아줘",
  autoRun: false,
});
assert.ok(
  sameDomain.action?.id !== "search_eatery" || sameDomain.continued === false,
  "must not re-queue same eatery domain",
);

console.log("OK — soft-next-work-after-act");
