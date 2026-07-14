/**
 * Reference — "일본 여행 갈래" → Capability Graph (before spatial detail).
 * Globe AI computes required capabilities first — not hotel search.
 */

import {
  composeCapabilityGraph,
  type CapabilityGraph,
} from "@/lib/context-blueprint/capability-graph";
import { composeContextBlueprint, type ContextBlueprint } from "@/lib/context-blueprint/types";
import { composePhysicalSpatialTarget } from "@/lib/context-blueprint/spatial-target";
import type { ExecutionSpace } from "@/lib/context-blueprint/spatial-plan";
import {
  composeExecutionGraph,
  type ExecutionGraph,
} from "@/lib/context-blueprint/execution-graph";

export function composeJapanTravelCapabilityGraph(): CapabilityGraph {
  return composeCapabilityGraph({
    capabilities: [
      {
        id: "cap-mobility",
        kind: "mobility",
        label: "이동",
        required: true,
        resolution: "hypothesis",
        spatialTarget: composePhysicalSpatialTarget({
          label: "Origin → Japan",
          resolution: "hypothesis",
        }),
        resourceKinds: ["flight", "transit", "ticket"],
        assignedExecutor: "transit",
        status: "pending",
      },
      {
        id: "cap-lodging",
        kind: "lodging",
        label: "숙박",
        required: true,
        resolution: "unresolved",
        spatialTarget: composePhysicalSpatialTarget({
          label: "Stay region (Japan)",
          resolution: "unresolved",
          linkedSlotId: "destination",
        }),
        resourceKinds: ["lodging"],
        assignedExecutor: "lodging",
        status: "pending",
      },
      {
        id: "cap-eatery",
        kind: "eatery",
        label: "식사",
        required: true,
        resolution: "hypothesis",
        spatialTarget: composePhysicalSpatialTarget({
          label: "Near stay area",
          resolution: "hypothesis",
          linkedSlotId: "destination",
        }),
        resourceKinds: ["eatery"],
        assignedExecutor: "eatery",
        parentCapabilityId: "cap-lodging",
        status: "pending",
      },
      {
        id: "cap-payment",
        kind: "payment",
        label: "결제",
        required: true,
        resolution: "hypothesis",
        spatialTarget: null,
        resourceKinds: ["payment"],
        assignedExecutor: "finance",
        status: "pending",
      },
      {
        id: "cap-schedule",
        kind: "schedule",
        label: "일정",
        required: true,
        resolution: "hypothesis",
        spatialTarget: null,
        resourceKinds: ["schedule"],
        assignedExecutor: "schedule",
        status: "pending",
      },
      {
        id: "cap-communication",
        kind: "communication",
        label: "통신",
        required: true,
        resolution: "hypothesis",
        spatialTarget: null,
        resourceKinds: ["documents"],
        assignedExecutor: "travel",
        status: "pending",
      },
      {
        id: "cap-insurance",
        kind: "insurance",
        label: "보험",
        required: false,
        resolution: "hypothesis",
        spatialTarget: null,
        resourceKinds: ["insurance"],
        assignedExecutor: "travel",
        status: "pending",
      },
    ],
    edges: [
      { fromCapabilityId: "cap-lodging", toCapabilityId: "cap-eatery", reason: "near_stay" },
      { fromCapabilityId: "cap-mobility", toCapabilityId: "cap-lodging", reason: "after_arrival" },
    ],
  });
}

export function composeJapanTravelExecutionGraph(
  capabilityGraph: CapabilityGraph,
): ExecutionGraph {
  void capabilityGraph;
  return composeExecutionGraph({
    nodes: [
      {
        id: "exec-frame",
        kind: "discover",
        label: "여행 실행 프레임 설계",
        resolution: "hypothesis",
        resourceKinds: ["flight", "lodging", "schedule"],
        actions: [],
        assignedExecutor: "travel",
        capabilityIds: ["cap-mobility", "cap-lodging", "cap-schedule"],
      },
      {
        id: "exec-destination",
        kind: "prepare",
        label: "목적지 확정",
        resolution: "unresolved",
        resourceKinds: ["lodging"],
        actions: [],
        assignedExecutor: "travel",
        capabilityIds: ["cap-lodging"],
      },
      {
        id: "exec-lodging",
        kind: "allocate",
        label: "숙소 후보 준비",
        resolution: "unresolved",
        resourceKinds: ["lodging"],
        actions: [],
        assignedExecutor: "lodging",
        capabilityIds: ["cap-lodging"],
      },
      {
        id: "exec-mobility",
        kind: "allocate",
        label: "이동 수단 준비",
        resolution: "hypothesis",
        resourceKinds: ["flight", "transit"],
        actions: [],
        assignedExecutor: "transit",
        capabilityIds: ["cap-mobility"],
      },
      {
        id: "exec-commit",
        kind: "approval_gate",
        label: "예약 확정",
        resolution: "hypothesis",
        resourceKinds: ["lodging", "flight", "payment"],
        actions: [],
        assignedExecutor: "travel",
        capabilityIds: ["cap-lodging", "cap-mobility", "cap-payment"],
      },
    ],
    edges: [
      { fromNodeId: "exec-frame", toNodeId: "exec-destination" },
      { fromNodeId: "exec-destination", toNodeId: "exec-lodging" },
      { fromNodeId: "exec-destination", toNodeId: "exec-mobility" },
      { fromNodeId: "exec-lodging", toNodeId: "exec-commit" },
      { fromNodeId: "exec-mobility", toNodeId: "exec-commit" },
    ],
  });
}

export function composeJapanTravelCapabilityBundle(): {
  capabilityGraph: CapabilityGraph;
  executionGraph: ExecutionGraph;
} {
  const capabilityGraph = composeJapanTravelCapabilityGraph();
  const executionGraph = composeJapanTravelExecutionGraph(capabilityGraph);
  return { capabilityGraph, executionGraph };
}

/** L1 reference — Intent → Execution Graph → Capability Graph + travel MVP spatialPlan. */
export function composeJapanTravelBlueprintWithGraphs(input: {
  contextId: string;
  bridgeId?: string;
  runtimeId?: string;
  spatialPlan: ExecutionSpace;
}): ContextBlueprint {
  const { capabilityGraph, executionGraph } = composeJapanTravelCapabilityBundle();
  return composeContextBlueprint({
    containerKind: "travel",
    contextId: input.contextId,
    bridgeId: input.bridgeId,
    runtimeId: input.runtimeId,
    goal: "일본 여행",
    executionGraph,
    capabilityGraph,
    spatialPlan: input.spatialPlan,
    resourcePlan: {
      requiredResources: ["flight", "lodging", "transit", "eatery", "payment", "schedule"],
      knownTruth: [],
      emptySlots: ["destination", "lodging_place"],
      nextQuestion: {
        slotId: "destination",
        promptKo: "어디부터 시작할까요? 오사카 · 도쿄 · 후쿠오카",
      },
    },
    assignedExecutors: ["travel", "lodging", "transit", "eatery", "finance", "schedule"],
    approvalPolicy: "manual",
  });
}
