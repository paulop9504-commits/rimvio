import assert from "node:assert/strict";
import {
  advanceAgentNegotiationTurn,
  createAgentNegotiationRoom,
} from "@/lib/globe/market/coordination/agent-negotiation-room-engine";
import { AGENT_NEGOTIATION_PREFILL_LOADED_KO } from "@/lib/globe/market/coordination/agent-coordination-prefill-copy";
import { buildAgentNegotiationPrefillSlots } from "@/lib/globe/market/coordination/build-agent-negotiation-prefill-slots";
import { AGENT_NEGOTIATION_MAX_TURNS } from "@/lib/globe/market/coordination/agent-negotiation-types";

const FIXED_NOW = new Date("2026-07-03T10:00:00+09:00");

const listingMeta = {
  priceLine: "650,000원",
  priceMinKrw: 650_000,
  priceMaxKrw: 650_000,
  availabilityPreset: "weekend_day" as const,
};

const prefill = buildAgentNegotiationPrefillSlots(listingMeta, FIXED_NOW);
assert.ok(prefill.min_price_krw?.includes("650"));
assert.ok(prefill.max_price_krw?.includes("650"));
assert.ok(prefill.meet_time_label, "weekend preset should yield meet time");

const bare = createAgentNegotiationRoom({
  handshakeId: "hs-bare",
  threadId: null,
  productTitle: "아이패드",
  priceLine: "650,000원",
  peerDisplayName: "상대",
  viewerRole: "seeking",
});

let bareTurns = 0;
let bareWaiting = 0;
let current = bare;
while (
  current.state === "NEGOTIATING" &&
  current.turnCount < AGENT_NEGOTIATION_MAX_TURNS &&
  bareTurns < 12
) {
  current = advanceAgentNegotiationTurn(current);
  bareTurns += 1;
  if (current.state === "WAITING_USER_INPUT") {
    bareWaiting += 1;
    break;
  }
}
assert.ok(bareWaiting >= 1, "without prefill should pause for slot input");

const prefilled = createAgentNegotiationRoom({
  handshakeId: "hs-prefill",
  threadId: null,
  productTitle: "아이패드",
  priceLine: listingMeta.priceLine,
  peerDisplayName: "상대",
  viewerRole: "seeking",
  availabilityPreset: listingMeta.availabilityPreset,
  priceMinKrw: listingMeta.priceMinKrw,
  priceMaxKrw: listingMeta.priceMaxKrw,
  prefillSlots: prefill,
});

assert.ok(
  prefilled.log.some(
    (entry) =>
      entry.type === "system" && entry.text === AGENT_NEGOTIATION_PREFILL_LOADED_KO,
  ),
);
assert.ok(prefilled.filledSlots.min_price_krw);
assert.ok(prefilled.filledSlots.max_price_krw);
assert.ok(prefilled.filledSlots.meet_time_label);

let prefillWaiting = 0;
let prefillTurns = 0;
current = prefilled;
while (
  current.state === "NEGOTIATING" &&
  current.turnCount < AGENT_NEGOTIATION_MAX_TURNS &&
  prefillTurns < 12
) {
  current = advanceAgentNegotiationTurn(current);
  prefillTurns += 1;
  if (current.state === "WAITING_USER_INPUT") {
    prefillWaiting += 1;
    break;
  }
}

assert.equal(prefillWaiting, 0, "prefilled keys must not open slot chips");
assert.equal(current.state, "AGREED");
assert.ok(current.proposal?.priceKo.includes("650"));
assert.ok(current.proposal?.meetTimeKo);
assert.ok(prefillTurns <= 7, "prefill should reach AGREED within engine turn budget");

console.log("test-agent-coordination-prefill: ok");
