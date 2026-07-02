import assert from "node:assert/strict";
import { buildGlobeChatActionHint } from "../lib/portal/compose-draft/build-globe-chat-action-hint";
import { copy } from "../lib/copy/human-ko";
import type { PortalComposeRunState } from "../lib/portal/portal-compose-run-store";

function softSignalState(): PortalComposeRunState {
  return {
    graphId: "g1",
    intentId: "market_sell",
    categoryId: null,
    composeSeed: "seed",
    accumulatedText: "핸드폰 판매",
    eventId: "e1",
    pendingSlotId: null,
    askedCount: 0,
    status: "conversing",
    intentStage: { stage: "soft_signal", possibleIntent: "sell_item" },
    composeSchemaId: "sell_item",
    updatedAt: new Date().toISOString(),
  };
}

function main() {
  const soft = buildGlobeChatActionHint({
    composeState: softSignalState(),
    messages: [
      {
        id: "u1",
        role: "user",
        kind: "text",
        text: "핸드폰 판매",
        createdAt: "1",
      },
      {
        id: "a1",
        role: "assistant",
        kind: "text",
        text: copy.portal.composeIntentSoftProductHint("핸드폰"),
        createdAt: "2",
      },
    ],
  });
  assert.ok(soft);
  assert.equal(soft.bodyKo, copy.globe.chatActionHintSoftConfirm);
  assert.equal(soft.pills.length, 3);
  assert.equal(soft.pills[0]?.labelKo, "맞아요");

  const priceSlot = buildGlobeChatActionHint({
    composeState: {
      ...softSignalState(),
      status: "waiting_slot",
      pendingSlotId: "priceKrw",
      pendingClarifyKind: "slot",
    },
    messages: [
      {
        id: "s1",
        role: "assistant",
        kind: "slot_prompt",
        text: copy.portal.slotAskPrice,
        clarifyKind: "slot",
        slotId: "priceKrw",
        createdAt: "3",
      },
    ],
  });
  assert.ok(priceSlot);
  assert.equal(priceSlot.pills[0]?.labelKo, "70만원");

  const withChips = buildGlobeChatActionHint({
    composeState: softSignalState(),
    messages: [
      {
        id: "s2",
        role: "assistant",
        kind: "slot_prompt",
        text: copy.portal.slotAskCondition,
        clarifyKind: "slot",
        slotId: "condition",
        choices: [{ id: "good", labelKo: "상태 좋음" }],
        createdAt: "4",
      },
    ],
  });
  assert.equal(withChips, null);

  const photos = buildGlobeChatActionHint({
    composeState: {
      ...softSignalState(),
      status: "ready",
      composeDraft: {
        productName: "아이폰15",
        priceKrw: 700_000,
        condition: "좋음",
        placeLabel: "계산동",
      },
    },
    messages: [],
  });
  assert.ok(photos);
  assert.equal(photos.pills.length, 0);
  assert.match(photos.bodyKo, /＋/u);

  const emptyChat = buildGlobeChatActionHint({
    composeState: null,
    messages: [],
  });
  assert.ok(emptyChat);
  assert.equal(emptyChat.pills.length, 2);

  console.log("build-globe-chat-action-hint: PASS");
}

main();
