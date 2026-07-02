import assert from "node:assert/strict";
import {
  applyAgentNegotiationLlmTurn,
  parseAgentNegotiationLlmTurn,
} from "@/lib/globe/market/coordination/apply-agent-negotiation-llm-turn";
import { createAgentNegotiationRoom } from "@/lib/globe/market/coordination/agent-negotiation-room-engine";

const room = createAgentNegotiationRoom({
  handshakeId: "hs-llm",
  threadId: "t1",
  productTitle: "아이폰15",
  priceLine: "800,000원",
  peerDisplayName: "민수",
  viewerRole: "seeking",
});

const parsed = parseAgentNegotiationLlmTurn(
  JSON.stringify({
    action: "request_slot",
    speakerRole: "listing",
    messageKo: "가격 확인이 필요해요.",
    slotKey: "min_price_krw",
    questionKo: "최소 얼마까지 가능해요?",
    chips: ["70만원", "75만원"],
  }),
);
assert.ok(parsed);
assert.equal(parsed?.slotKey, "min_price_krw");

const blocked = applyAgentNegotiationLlmTurn(room, parsed!);
assert.equal(blocked.state, "WAITING_USER_INPUT");
assert.equal(blocked.pendingQuestion?.ownerRole, "listing");

const withSlots = {
  ...room,
  turnCount: 4,
  filledSlots: {
    min_price_krw: "75만원",
    max_price_krw: "80만원",
    meet_time_label: "토요일 오후 3시",
  },
};

const proposed = applyAgentNegotiationLlmTurn(
  withSlots,
  parseAgentNegotiationLlmTurn(
    JSON.stringify({
      action: "propose",
      speakerRole: "seeking",
      messageKo: "이 조건이면 진행할게요.",
      proposal: {
        priceKo: "75만원",
        meetTimeKo: "토요일 오후 3시",
        meetPlaceKo: "계산동",
      },
    }),
  )!,
);
assert.equal(proposed.state, "AGREED");
assert.equal(proposed.proposal?.priceKo, "75만원");

console.log("test-agent-negotiation-llm: ok");
