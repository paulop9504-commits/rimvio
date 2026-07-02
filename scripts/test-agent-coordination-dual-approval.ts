import assert from "node:assert/strict";
import {
  advanceAgentNegotiationTurn,
  answerAgentNegotiationSlot,
  createAgentNegotiationRoom,
  recordAgentNegotiationPartyApproval,
} from "@/lib/globe/market/coordination/agent-negotiation-room-engine";
import {
  detectAgentCoordinationAttentionChanges,
  viewerHasApprovedCoordination,
} from "@/lib/globe/market/coordination/detect-agent-coordination-attention";

function reachAgreed(viewerRole: "seeking" | "listing") {
  let current = createAgentNegotiationRoom({
    handshakeId: "hs-dual",
    threadId: "thread-1",
    productTitle: "맥북",
    priceLine: "1,200,000원",
    peerDisplayName: "상대",
    viewerRole,
  });
  for (let index = 0; index < 12; index += 1) {
    current = advanceAgentNegotiationTurn(current);
    if (current.state === "WAITING_USER_INPUT" && current.pendingQuestion) {
      const value =
        current.pendingQuestion.slotKey === "max_price_krw"
          ? (current.pendingQuestion.chips?.[0] ?? "110만원")
          : current.pendingQuestion.slotKey === "min_price_krw"
            ? (current.pendingQuestion.chips?.[0] ?? "105만원")
            : (current.pendingQuestion.chips?.[0] ?? "토요일 오후 2시");
      current = answerAgentNegotiationSlot(
        current,
        current.pendingQuestion.slotKey,
        value,
      );
    }
    if (current.state === "AGREED") {
      break;
    }
  }
  assert.equal(current.state, "AGREED");
  return current;
}

const agreedSeeking = reachAgreed("seeking");
const afterSeekingApprove = recordAgentNegotiationPartyApproval(agreedSeeking);
assert.equal(afterSeekingApprove.state, "AGREED");
assert.ok(afterSeekingApprove.seekingApprovedAtIso);
assert.equal(afterSeekingApprove.listingApprovedAtIso, null);
assert.equal(viewerHasApprovedCoordination(afterSeekingApprove), true);

const agreedListing = {
  ...afterSeekingApprove,
  viewerRole: "listing" as const,
  seekingApprovedAtIso: afterSeekingApprove.seekingApprovedAtIso,
  listingApprovedAtIso: null,
};
const fullyApproved = recordAgentNegotiationPartyApproval(agreedListing);
assert.equal(fullyApproved.state, "APPROVED");
assert.ok(fullyApproved.seekingApprovedAtIso);
assert.ok(fullyApproved.listingApprovedAtIso);

const previous = {
  [agreedSeeking.handshakeId]: agreedSeeking,
};
const slotEvents = detectAgentCoordinationAttentionChanges({
  previousByHandshake: {},
  nextRooms: [
    {
      ...agreedSeeking,
      state: "WAITING_USER_INPUT",
      pendingQuestion: {
        slotKey: "max_price_krw",
        ownerRole: "seeking",
        questionKo: "최대 가격은?",
        chips: ["70만원"],
      },
    },
  ],
});
assert.equal(slotEvents[0]?.kind, "slot_needed");

const proposalEvents = detectAgentCoordinationAttentionChanges({
  previousByHandshake: previous,
  nextRooms: [afterSeekingApprove],
});
assert.equal(proposalEvents.length, 0);

const peerApprovedEvents = detectAgentCoordinationAttentionChanges({
  previousByHandshake: { [agreedSeeking.handshakeId]: afterSeekingApprove },
  nextRooms: [
    {
      ...afterSeekingApprove,
      listingApprovedAtIso: "2026-07-02T00:00:00.000Z",
    },
  ],
});
assert.equal(peerApprovedEvents[0]?.kind, "peer_approved");

const fullyApprovedEvents = detectAgentCoordinationAttentionChanges({
  previousByHandshake: { [agreedSeeking.handshakeId]: afterSeekingApprove },
  nextRooms: [fullyApproved],
});
assert.equal(fullyApprovedEvents[0]?.kind, "fully_approved");

console.log("test-agent-coordination-dual-approval: ok");
