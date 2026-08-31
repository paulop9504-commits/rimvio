/**
 * P2 Capability discovery / reuse-before-create smoke.
 * Run: npm run test:agent-os-p2
 */
import assert from "node:assert/strict";
import {
  selectNextCapabilityFromState,
  readCapabilityDevelopmentRequests,
  resetCapabilityDevelopmentRequestsForTests,
} from "@/lib/agent-os";
import { evaluateReuseGate } from "@/lib/rimvio-index/reuse-gate";
import { resolveCapabilityIntent } from "@/lib/rimvio-index/resolve-capability-intent";
import { planCapabilityDiscovery } from "@/lib/platform-sdk/discover-capabilities";

resetCapabilityDevelopmentRequestsForTests();

// Case A — hotel search reuses existing capability path (no create)
const hotelIntent = resolveCapabilityIntent({
  utterance: "오사카 호텔 찾아줘",
  contextEventId: "ctx-p2-hotel",
});

const hotelTool = selectNextCapabilityFromState({
  agentId: "lodging",
  utterance: "오사카 호텔 찾아줘",
  contextEventId: "ctx-p2-hotel",
  observations: [],
  lastToolId: null,
  lastVerified: false,
});
assert.equal(hotelTool.toolId, "hotel.lookup", "reuse domain tool — no duplicate hotel capability");

if (hotelIntent.reuse.decision === "reuse") {
  const hotelDiscovery = planCapabilityDiscovery({
    utterance: "오사카 호텔 찾아줘",
  });
  assert.ok(
    hotelDiscovery?.capabilityId || hotelIntent.reuse.topHit?.capabilityId,
    "existing capability discoverable for hotel",
  );
}

// Case B — Coupang purchase missing → Hub dev request
const COUPANG_UTTERANCE = "쿠팡에서 생수 적당한 걸 구매해줘 unique-p2-token";
const coupangIntent = resolveCapabilityIntent({
  utterance: COUPANG_UTTERANCE,
  contextEventId: "ctx-p2-coupang",
});

if (coupangIntent.reuse.decision === "create") {
  const blocked = selectNextCapabilityFromState({
    agentId: "unknown-commerce",
    utterance: COUPANG_UTTERANCE,
    contextEventId: "ctx-p2-coupang",
    observations: [],
    lastToolId: null,
    lastVerified: false,
  });
  assert.equal(blocked.toolId, null);
  assert.ok(blocked.blockedReasonKo);
  const queued = readCapabilityDevelopmentRequests().filter(
    (r) => r.contextEventId === "ctx-p2-coupang",
  );
  assert.ok(queued.length >= 1, "missing capability → Hub development request");
} else {
  const gate = evaluateReuseGate({ utterance: COUPANG_UTTERANCE });
  assert.ok(
    gate.decision === "reuse" || gate.decision === "improve",
    "partial coupang capabilities should reuse/improve not blind create",
  );
}

// Improve path does not block execution entirely
const improveGate = evaluateReuseGate({ utterance: "중고거래 market search" });
if (improveGate.decision === "improve") {
  const improvePick = selectNextCapabilityFromState({
    agentId: "lodging",
    utterance: "중고거래 market search",
    contextEventId: "ctx-p2-improve",
    observations: [],
    lastToolId: null,
    lastVerified: false,
  });
  assert.ok(improvePick.toolId, "improve still allows tool execution");
}

resetCapabilityDevelopmentRequestsForTests();

console.log("ok — agent-os P2 capability discovery (reuse · improve · hub request)");
