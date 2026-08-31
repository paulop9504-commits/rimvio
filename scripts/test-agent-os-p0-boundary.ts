/**
 * P0 Agent OS boundary smoke — Main / Hub / Worker roles + dev request contract.
 * Run: npm run test:agent-os-p0
 */
import assert from "node:assert/strict";
import {
  inferRimvioAgentRole,
  buildMainAgentContext,
  buildHubAgentContext,
  createCapabilityDevelopmentRequest,
  capabilityDevelopmentRequestFromReuseGate,
  readCapabilityDevelopmentRequests,
  readSharedExecutionState,
  resetCapabilityDevelopmentRequestsForTests,
  workspacePhaseToMainPhase,
  hubStatusToMainPhase,
  MAIN_AGENT_LOOP_LIMITS,
} from "@/lib/agent-os";
import { evaluateReuseGate } from "@/lib/rimvio-index/reuse-gate";
import { resetImprovementTasksForTests } from "@/lib/rimvio-index/improvement-task-pool";
import { resolveCapabilityIntent } from "@/lib/rimvio-index/resolve-capability-intent";
import {
  beginAgentProductTurn,
  clearLastAgentProductTurnForTests,
} from "@/lib/context-run/agent-product-pipeline";
import {
  clearLastRimvioAgentRuntimeTurnForTests,
} from "@/lib/workstream/rimvio-agent-runtime";

resetCapabilityDevelopmentRequestsForTests();
resetImprovementTasksForTests();
clearLastAgentProductTurnForTests();
clearLastRimvioAgentRuntimeTurnForTests();

assert.equal(inferRimvioAgentRole({ contextEventId: "ctx-trip-osaka" }), "main");
assert.equal(
  inferRimvioAgentRole({ contextEventId: "hub:workspace:travel-dev" }),
  "hub",
);
assert.equal(
  inferRimvioAgentRole({
    contextEventId: "ctx-trip-osaka",
    agentId: "lodging-worker",
  }),
  "worker",
);

assert.equal(workspacePhaseToMainPhase("observe"), "observing");
assert.equal(workspacePhaseToMainPhase("verify"), "verifying");
assert.equal(hubStatusToMainPhase("executing"), "acting");
assert.ok(MAIN_AGENT_LOOP_LIMITS.MAX_ITERATIONS >= 8);

const mainCtx = buildMainAgentContext({
  contextEventId: "ctx-boundary-test",
  utterance: "오사카 호텔 찾아줘",
});
assert.equal(mainCtx.role, "main");
assert.equal(mainCtx.intentUtterance, "오사카 호텔 찾아줘");
assert.equal(mainCtx.goal, "오사카 호텔 찾아줘");

const hubCtx = buildHubAgentContext({ platformId: "travel-dev" });
assert.equal(hubCtx.role, "hub");
assert.equal(hubCtx.hubId, "travel-dev");
assert.equal(hubCtx.workspaceId, "hub:workspace:travel-dev");

const devReq = createCapabilityDevelopmentRequest({
  goal: "쿠팡에서 생수 구매",
  capabilityType: "commerce.coupang.purchase",
  reason: "Purchase capability missing",
  relatedCapabilities: ["commerce.coupang.search", "commerce.coupang.cart"],
  contextEventId: "ctx-commerce",
});
assert.equal(devReq.sourceRole, "main");
assert.equal(devReq.status, "open");
assert.ok(readCapabilityDevelopmentRequests().some((r) => r.requestId === devReq.requestId));

const CREATE_UTTERANCE = "완전히 새로운 xyz capability abc123 unique-token-9001";

const reuse = evaluateReuseGate({ utterance: CREATE_UTTERANCE });
if (reuse.decision === "create") {
  const fromGate = capabilityDevelopmentRequestFromReuseGate({
    utterance: CREATE_UTTERANCE,
    reuse,
    contextEventId: "ctx-create-gate",
  });
  assert.equal(fromGate.capabilityType, "capability.new");
}

beginAgentProductTurn({
  contextEventId: "ctx-product-boundary",
  utterance: "중고거래 market search",
});
const shared = readSharedExecutionState({
  contextEventId: "ctx-product-boundary",
  utterance: "중고거래 market search",
});
assert.equal(shared.role, "main");
assert.ok(shared.main);
assert.equal(shared.main?.role, "main");

const intent = resolveCapabilityIntent({
  utterance: CREATE_UTTERANCE,
  contextEventId: "ctx-create-intent",
});
if (intent.reuse.decision === "create") {
  const queued = readCapabilityDevelopmentRequests().filter(
    (r) => r.contextEventId === "ctx-create-intent",
  );
  assert.ok(queued.length >= 1, "create decision enqueues Hub dev request");
}

resetCapabilityDevelopmentRequestsForTests();
resetImprovementTasksForTests();
clearLastAgentProductTurnForTests();
clearLastRimvioAgentRuntimeTurnForTests();

console.log("ok — agent-os P0 boundary (roles · contexts · dev request contract)");
