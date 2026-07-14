import assert from "node:assert/strict";
import {
  getActiveAgentNegotiationRoomsCountSnapshot,
  getAgentNegotiationRoomsSnapshot,
  listAgentNegotiationRooms,
} from "@/lib/globe/market/coordination/agent-negotiation-store";

const a = getAgentNegotiationRoomsSnapshot();
const b = getAgentNegotiationRoomsSnapshot();
assert.equal(a, b, "rooms getSnapshot must be referentially stable");
assert.equal(listAgentNegotiationRooms(), a);

const c1 = getActiveAgentNegotiationRoomsCountSnapshot();
const c2 = getActiveAgentNegotiationRoomsCountSnapshot();
assert.equal(c1, c2);

console.log("test-agent-negotiation-snapshot-stability: ok");
