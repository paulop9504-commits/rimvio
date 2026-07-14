import assert from "node:assert/strict";
import { composeTravelTripBlueprint } from "../lib/context-blueprint/examples/travel-trip-execution-graph";
import {
  isValidContextRunTransition,
  CONTEXT_RUN_STATES,
} from "../lib/context-blueprint/context-run-state";
import {
  advanceContextExecutionPlanStep,
  approveContextExecutionPlan,
  applyContextExecutionPlanToMetadata,
  buildContextExecutionPlanFromBlueprint,
  buildContextHubPlanPreviewRows,
  formatContextExecutionPlanPreviewKo,
  gateContextExecutionPlanForUserApproval,
  needsContextExecutionPlanApproval,
  parseContextExecutionPlan,
  patchTravelExecutionPlanForDestination,
  readActivePlanStep,
  readContextExecutionPlanFromMetadata,
  resolveContextExecutionPlanApprovalGate,
  startContextExecutionPlanRuntime,
} from "../lib/context-execution";
import { approveRealitySurfaceExecutionPlan } from "../lib/reality-surface/approve-reality-surface-execution-plan";
import { composeRealitySurfaceFromBlueprint } from "../lib/reality-surface/project-globe-ingress";

const blueprint = composeTravelTripBlueprint({
  contextId: "ctx-plan-test",
  bridgeId: "bridge-plan-test",
  runtimeId: "runtime-plan-test",
  goal: "오사카 3박 4일",
});

const plan = buildContextExecutionPlanFromBlueprint({
  blueprint,
  build: { contextId: "evt-plan-test", goalKo: "오사카 3박 4일" },
});
assert.ok(plan);
assert.equal(plan!.version, 1);
assert.equal(plan!.osPhase, "execution_planned");
assert.ok(plan!.steps.length >= 5);
assert.ok(plan!.currentStepId);

const preview = formatContextExecutionPlanPreviewKo(plan!);
assert.ok(preview.includes("Trip") || preview.includes("Prepare"));

const previewRows = buildContextHubPlanPreviewRows(plan!);
assert.ok(previewRows.length >= 5);
assert.ok(previewRows.some((row) => row.isCurrent));

const advanced = patchTravelExecutionPlanForDestination({
  blueprint,
  plan,
  contextId: "evt-plan-test",
});
assert.ok(advanced);
const stayStep = advanced!.steps.find((step) => step.nodeId === "stay");
assert.equal(stayStep?.status, "running");
assert.equal(readActivePlanStep(advanced!)?.nodeId, "stay");

const failed = advanceContextExecutionPlanStep({
  plan: advanced!,
  nodeId: "departure",
  status: "blocked",
  lastError: "매진",
});
const departure = failed.steps.find((step) => step.nodeId === "departure");
assert.equal(departure?.status, "blocked");
assert.equal(departure?.lastError, "매진");

const approved = approveContextExecutionPlan({ plan: plan! });
assert.equal(approved.approval, "approved");
assert.equal(approved.osPhase, "executing");
assert.ok(!needsContextExecutionPlanApproval(approved));

const gated = gateContextExecutionPlanForUserApproval({ plan: plan! });
assert.equal(gated.osPhase, "plan_waiting_approval");
assert.equal(gated.approval, "pending");
assert.ok(needsContextExecutionPlanApproval(gated));

const resolved = resolveContextExecutionPlanApprovalGate({ plan: plan!, blueprint });
assert.equal(resolved?.osPhase, "plan_waiting_approval");

const started = startContextExecutionPlanRuntime({ plan: gated });
assert.equal(started.osPhase, "executing");
assert.equal(started.approval, "approved");
assert.ok(started.steps.some((step) => step.status === "running"));

const session = composeRealitySurfaceFromBlueprint({
  eventId: "evt-plan-test",
  goalKo: blueprint.goal,
  bridgePathLabels: ["집", "공항", "목적지", "호텔"],
  blueprint,
  runtimeId: blueprint.runtimeId,
  executionPlan: gated,
});
const approvedSession = approveRealitySurfaceExecutionPlan(session);
assert.equal(approvedSession.executionPlan?.approval, "approved");

const metadata = applyContextExecutionPlanToMetadata({
  metadata: {},
  plan: plan!,
});
const fromMeta = readContextExecutionPlanFromMetadata(metadata);
assert.equal(fromMeta?.contextId, "evt-plan-test");

const roundTrip = parseContextExecutionPlan(metadata.contextExecutionPlanV1);
assert.deepEqual(roundTrip?.steps.map((s) => s.nodeId), plan!.steps.map((s) => s.nodeId));

assert.ok(CONTEXT_RUN_STATES.includes("execution_planned"));
assert.ok(CONTEXT_RUN_STATES.includes("plan_waiting_approval"));
assert.ok(
  isValidContextRunTransition({
    from: "blueprint_created",
    to: "execution_planned",
  }),
);
assert.ok(
  isValidContextRunTransition({
    from: "execution_planned",
    to: "executing",
  }),
);
assert.ok(
  isValidContextRunTransition({
    from: "plan_waiting_approval",
    to: "executing",
  }),
);

console.log("test-context-execution-plan: ok");
