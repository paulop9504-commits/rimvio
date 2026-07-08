import assert from "node:assert/strict";
import { composeTravelTripBlueprint } from "../lib/context-blueprint/examples/travel-trip-execution-graph";
import {
  assertNodeResourceAnchor,
  assertTravelRescoutAllowed,
  planTravelDateDependentRescout,
} from "../lib/context-blueprint/node-resource-state";
import {
  classifyTravelRequestScope,
  evaluateOnboardingParallelException,
  gateContainerAIRequest,
  hasDateRangeSignal,
  hasDelegationSignal,
} from "../lib/container-ai";

const blueprint = composeTravelTripBlueprint({
  contextId: "evt-onboarding-parallel",
  goal: "오사카 7일",
});

const departure = blueprint.executionGraph?.nodes.find((n) => n.id === "departure");
const stay = blueprint.executionGraph?.nodes.find((n) => n.id === "stay");
const explore = blueprint.executionGraph?.nodes.find((n) => n.id === "explore");
assert.ok(departure?.resourceState);
assert.equal(departure!.resourceState!.dateDependent, true);
assert.equal(departure!.resourceState!.anchorRef, null);
assert.equal(stay!.resourceState!.anchorRef, "destination");
assert.equal(explore!.resourceState!.dateDependent, false);

assert.equal(assertNodeResourceAnchor({
  nodeKind: "departure",
  resourceState: departure!.resourceState,
}).ok, true);
assert.equal(assertNodeResourceAnchor({
  nodeKind: "stay",
  resourceState: { ...stay!.resourceState!, anchorRef: null },
}).ok, false);

assert.equal(classifyTravelRequestScope("오사카 7일 여행, 초행이라 잘 부탁해").scope, "broad");
assert.equal(classifyTravelRequestScope("오사카 여행 갈거야").scope, "broad");
assert.equal(classifyTravelRequestScope("맛집 찾아줘").scope, "narrow");
assert.equal(
  classifyTravelRequestScope("오사카 가는데, 일단 항공권만 좀 찾아줘").scope,
  "narrow",
);
assert.equal(
  classifyTravelRequestScope("아 다낭도 갈까? 거기도 다 알아서 찾아줘").scope,
  "broad",
);
assert.equal(hasDelegationSignal("초행이라 잘 부탁해"), true);
assert.equal(hasDateRangeSignal("오사카 7일 여행"), true);

const deniedUnresolved = evaluateOnboardingParallelException({
  blueprint,
  userMessage: "오사카 7일 여행, 초행이니까 잘 부탁해",
  destinationConfirmed: false,
});
assert.equal(deniedUnresolved.allowed, false);
if (!deniedUnresolved.allowed) {
  assert.equal(deniedUnresolved.code, "destination_not_confirmed");
}

const granted = evaluateOnboardingParallelException({
  blueprint,
  userMessage: "오사카 7일 여행, 초행이니까 잘 부탁해",
  destinationConfirmed: true,
});
assert.equal(granted.allowed, true);
if (granted.allowed) {
  assert.deepEqual([...granted.parallelNodeIds], ["departure", "stay", "explore"]);
  assert.equal(granted.scope, "broad");
}

// Later broad ask must re-open (no one-shot kill switch).
const laterBroad = evaluateOnboardingParallelException({
  blueprint,
  userMessage: "아 다낭도 갈까? 거기도 다 알아서 찾아줘",
  destinationConfirmed: true,
});
assert.equal(laterBroad.allowed, true);

const narrowDenied = evaluateOnboardingParallelException({
  blueprint,
  userMessage: "맛집 찾아줘",
  destinationConfirmed: true,
});
assert.equal(narrowDenied.allowed, false);
if (!narrowDenied.allowed) {
  assert.equal(narrowDenied.code, "request_scope_narrow");
}

const firstNarrow = evaluateOnboardingParallelException({
  blueprint,
  userMessage: "오사카 가는데, 일단 항공권만 좀 찾아줘",
  destinationConfirmed: true,
});
assert.equal(firstNarrow.allowed, false);

const gated = gateContainerAIRequest({
  blueprint,
  userMessage: "오사카 7일 여행, 초행이니까 잘 부탁해",
  activeNodeId: "prepare",
  destinationConfirmed: true,
});
assert.equal(gated.allowed, true);
if (gated.allowed) {
  assert.ok(gated.onboardingParallel);
  assert.equal(gated.onboardingParallel?.parallelNodeIds.length, 3);
}

const lodgingStillBlocked = gateContainerAIRequest({
  blueprint,
  userMessage: "주변 호텔 찾아줘",
  activeNodeId: "prepare",
});
assert.equal(lodgingStillBlocked.allowed, false);

const lockedPlan = planTravelDateDependentRescout({
  nodes: [
    {
      id: "departure",
      kind: "departure",
      resourceState: {
        status: "locked",
        dateDependent: true,
        anchorRef: null,
        candidates: [],
        selected: null,
      },
    },
    {
      id: "stay",
      kind: "stay",
      resourceState: {
        status: "filled",
        dateDependent: true,
        anchorRef: "destination",
        candidates: [],
        selected: null,
      },
    },
    {
      id: "explore",
      kind: "explore",
      resourceState: {
        status: "filled",
        dateDependent: false,
        anchorRef: "destination",
        candidates: [],
        selected: null,
      },
    },
  ],
});
assert.deepEqual([...lockedPlan.rescoutNodeIds], ["stay"]);
assert.deepEqual([...lockedPlan.availabilityRecheckNodeIds], ["departure"]);
assert.deepEqual([...lockedPlan.skippedExploreNodeIds], ["explore"]);

const lockedBlock = assertTravelRescoutAllowed({
  resourceState: {
    status: "locked",
    dateDependent: true,
    anchorRef: null,
    candidates: [],
    selected: null,
  },
});
assert.equal(lockedBlock.ok, false);
if (!lockedBlock.ok) {
  assert.equal(lockedBlock.forceAction, "availability_recheck");
}

console.log("test-travel-onboarding-parallel: ok");
