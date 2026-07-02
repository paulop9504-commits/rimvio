import assert from "node:assert/strict";
import {
  advanceAgentNegotiationTurn,
  answerAgentNegotiationSlot,
  createAgentNegotiationRoom,
} from "@/lib/globe/market/coordination/agent-negotiation-room-engine";

const room = createAgentNegotiationRoom({
  handshakeId: "hs-test",
  threadId: "thread-1",
  productTitle: "아이폰15",
  priceLine: "800,000원",
  peerDisplayName: "민수",
  viewerRole: "seeking",
});

let current = room;
for (let index = 0; index < 3; index += 1) {
  current = advanceAgentNegotiationTurn(current);
}

assert.equal(current.turnCount, 3);
assert.equal(current.state, "WAITING_USER_INPUT");
assert.ok(current.pendingQuestion?.slotKey === "max_price_krw");

current = answerAgentNegotiationSlot(current, "max_price_krw", "75만원");
assert.equal(current.state, "NEGOTIATING");
assert.ok(
  current.log.some(
    (entry) => entry.type === "user_injected" && entry.valueKo === "75만원",
  ),
);

for (let index = 0; index < 6; index += 1) {
  current = advanceAgentNegotiationTurn(current);
  if (current.state === "WAITING_USER_INPUT" && current.pendingQuestion) {
    const chip = current.pendingQuestion.chips?.[0] ?? "토요일 오후 3시";
    current = answerAgentNegotiationSlot(
      current,
      current.pendingQuestion.slotKey,
      chip,
    );
  }
}

assert.equal(current.state, "AGREED");
assert.ok(current.proposal?.priceKo.includes("75"));

console.log("test-agent-negotiation-room: ok");
