#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildGlobeChatActionHint } from "../lib/portal/compose-draft/build-globe-chat-action-hint";
import { flowStepsToAgentTasks } from "../lib/portal/compose-draft/flow-steps-to-agent-tasks";
import {
  findNextSellItemFlowStep,
  resolveSellItemFlow,
} from "../lib/portal/compose-draft/sell-item-flow";
import { copy } from "../lib/copy/human-ko";

/** Screenshot regression: price+condition filled, place still open — sidebar must not jump to photos. */
const smartphoneMidPlace = {
  productName: "아이폰 15",
  priceKrw: 700_000,
  condition: "상태 좋음",
};
const smartphoneFlow = resolveSellItemFlow({ categoryId: "smartphone" });
const sidebarMid = flowStepsToAgentTasks(smartphoneFlow, smartphoneMidPlace);
assert.equal(sidebarMid[0]?.status, "in_progress", "basic info still open without place");
assert.equal(sidebarMid[1]?.status, "pending", "photo step must stay pending while asking place");

const nextMid = findNextSellItemFlowStep(smartphoneMidPlace, {
  categoryId: "smartphone",
});
assert.equal(nextMid?.key, "basic_info");

const placeHint = buildGlobeChatActionHint({
  composeState: {
    graphId: "g1",
    intentId: "sell_item",
    composeSchemaId: "sell_item",
    status: "waiting_slot",
    pendingSlotId: "placeLabel",
    pendingClarifyKind: "slot",
    productCategoryId: "smartphone",
    productCategoryStatus: "confirmed",
    composeDraft: smartphoneMidPlace,
    slotExtras: {},
    skippedSlots: [],
    detailSlotFill: false,
    intentStage: { stage: "confirmed", resourceType: "sell_item" },
    accumulatedText: "",
    eventId: "e1",
    askedCount: 0,
    composeSeed: "",
    marketDraft: null,
    categoryId: null,
    socialSlots: {},
    pendingPriceConfirmKrw: null,
    proposedCategoryId: null,
  },
  messages: [
    {
      id: "q1",
      role: "assistant",
      kind: "slot_prompt",
      text: copy.portal.slotAskPlace,
      slotId: "placeLabel",
      clarifyKind: "slot",
    },
  ],
});
assert.ok(
  placeHint?.pills.some((pill) => pill.labelKo.includes("강남") || pill.id === "nearby"),
  "place step should show place chips, not photo-only hint",
);
assert.notEqual(placeHint?.bodyKo, copy.globe.chatActionHintPhotos);

/** After all text slots: sidebar photo + chat nudges media. */
const smartphoneReadyForPhoto = {
  ...smartphoneMidPlace,
  placeLabel: "계산동 722",
};
const sidebarPhoto = flowStepsToAgentTasks(smartphoneFlow, smartphoneReadyForPhoto);
assert.equal(sidebarPhoto[0]?.status, "done");
assert.equal(sidebarPhoto[1]?.status, "in_progress");
assert.match(sidebarPhoto[1]?.label ?? "", /사진/u);

const photoHint = buildGlobeChatActionHint({
  composeState: {
    graphId: "g1",
    intentId: "sell_item",
    composeSchemaId: "sell_item",
    status: "ready",
    pendingSlotId: null,
    pendingClarifyKind: null,
    productCategoryId: "smartphone",
    productCategoryStatus: "confirmed",
    composeDraft: smartphoneReadyForPhoto,
    slotExtras: {},
    skippedSlots: [],
    detailSlotFill: false,
    intentStage: { stage: "confirmed", resourceType: "sell_item" },
    accumulatedText: "",
    eventId: "e1",
    askedCount: 0,
    composeSeed: "",
    marketDraft: null,
    categoryId: null,
    socialSlots: {},
    pendingPriceConfirmKrw: null,
    proposedCategoryId: null,
  },
  messages: [
    {
      id: "a1",
      role: "assistant",
      kind: "text",
      text: copy.portal.slotReviewAskMedia,
    },
  ],
});
assert.equal(photoHint?.bodyKo, copy.globe.chatActionHintPhotos);

console.log("test-sell-item-flow-hint-alignment: ok");
