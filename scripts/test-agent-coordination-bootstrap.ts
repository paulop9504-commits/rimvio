import assert from "node:assert/strict";
import {
  advanceAgentNegotiationTurn,
  createAgentNegotiationRoom,
} from "@/lib/globe/market/coordination/agent-negotiation-room-engine";
import { AGENT_NEGOTIATION_MAX_TURNS } from "@/lib/globe/market/coordination/agent-negotiation-types";
import { AGENT_COORDINATION_BOOTSTRAP_MAX_TICKS } from "@/lib/globe/market/coordination/agent-negotiation-types";

function runBootstrapTickLoop(
  room: ReturnType<typeof createAgentNegotiationRoom>,
  maxTicks: number,
) {
  let current = room;
  let ticks = 0;
  while (
    current.state === "NEGOTIATING" &&
    current.turnCount < AGENT_NEGOTIATION_MAX_TURNS &&
    ticks < maxTicks
  ) {
    current = advanceAgentNegotiationTurn(current);
    ticks += 1;
    if (current.state !== "NEGOTIATING") {
      break;
    }
  }
  return { room: current, ticks };
}

const seeded = createAgentNegotiationRoom({
  handshakeId: "hs-bootstrap",
  threadId: "thread-1",
  productTitle: "아이패드",
  priceLine: "650,000원",
  peerDisplayName: "상대",
  viewerRole: "seeking",
  prefillSlots: {},
});

const capped = runBootstrapTickLoop(seeded, AGENT_COORDINATION_BOOTSTRAP_MAX_TICKS);
assert.ok(capped.ticks <= AGENT_COORDINATION_BOOTSTRAP_MAX_TICKS);
assert.notEqual(capped.room.state, "NEGOTIATING");

const negotiatingOnly = runBootstrapTickLoop(seeded, 2);
assert.equal(negotiatingOnly.ticks, 2);
assert.equal(negotiatingOnly.room.state, "NEGOTIATING");

console.log("test-agent-coordination-bootstrap: ok");
