/**
 * Container AI — reads Execution Graph for every user turn.
 * Container AI is the Operator; Globe AI is the Architect.
 * @see docs/RIMVIO_CONTAINER_AI.md
 */

import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";
import {
  readActiveExecutionGraphNode,
  readBlockedNodeIdsFromPlan,
  resolveEffectiveNodeStatus,
} from "@/lib/context-execution/read-active-plan-step";
import {
  CONTAINER_AI_USER_LABELS,
  type ContainerAICapabilityOffer,
  type ContainerAIContext,
  type ContainerAINodeSummary,
} from "@/lib/container-ai/types";
import { readSpatialTargetForNode } from "@/lib/context-blueprint/spatial-targets";
import type { ExecutionGraphNode } from "@/lib/context-blueprint/execution-graph";

const DESTINATION_NODE_IDS = ["stay", "arrival", "exec-destination"] as const;

function pickActiveExecutionNode(
  blueprint: ContextBlueprint,
  activeNodeId?: string | null,
  executionPlan?: ContextExecutionPlanV1 | null,
): ExecutionGraphNode | null {
  return readActiveExecutionGraphNode({
    graph: blueprint.executionGraph,
    plan: executionPlan ?? null,
    activeNodeId,
  });
}

function readDestinationFromBlueprint(
  blueprint: ContextBlueprint,
): { label: string | null; resolution: string | null } {
  const graph = blueprint.executionGraph;
  if (!graph) {
    return {
      label: blueprint.constraints.destination?.label ?? null,
      resolution: blueprint.constraints.destination ? "confirmed" : null,
    };
  }
  for (const nodeId of DESTINATION_NODE_IDS) {
    const node = graph.nodes.find((row) => row.id === nodeId);
    const spatial = blueprint.spatialTargets
      ? readSpatialTargetForNode(blueprint.spatialTargets, nodeId)
      : null;
    if (spatial?.label) {
      return { label: spatial.label, resolution: spatial.resolution };
    }
    if (node && node.resolution !== "hypothesis") {
      return { label: node.label, resolution: node.resolution };
    }
  }
  const staySpatial = blueprint.spatialTargets
    ? readSpatialTargetForNode(blueprint.spatialTargets, "stay")
    : null;
  if (staySpatial?.label) {
    return { label: staySpatial.label, resolution: staySpatial.resolution };
  }
  return {
    label: blueprint.constraints.destination?.label ?? null,
    resolution: blueprint.resourcePlan.emptySlots.includes("destination")
      ? "unresolved"
      : blueprint.constraints.destination
        ? "confirmed"
        : null,
  };
}

function toNodeSummary(
  node: ExecutionGraphNode,
  blueprint: ContextBlueprint,
  executionPlan?: ContextExecutionPlanV1 | null,
): ContainerAINodeSummary {
  const spatial = blueprint.spatialTargets
    ? readSpatialTargetForNode(blueprint.spatialTargets, node.id)
    : null;
  return {
    nodeId: node.id,
    kind: node.kind,
    label: node.label,
    status: resolveEffectiveNodeStatus({ node, plan: executionPlan ?? null }),
    resolution: node.resolution,
    spatialLabel: spatial?.label ?? null,
  };
}

function buildCapabilityOffers(node: ExecutionGraphNode): ContainerAICapabilityOffer[] {
  return node.resourceKinds.map((resourceKind) => ({
    kind: resourceKind,
    label: resourceKind,
    resourceKind,
    executor: node.assignedExecutor,
  }));
}

/** Container AI always reads Blueprint + active node before responding. */
export function readContainerAIContext(input: {
  blueprint: ContextBlueprint;
  activeNodeId?: string | null;
  executionPlan?: ContextExecutionPlanV1 | null;
}): ContainerAIContext | null {
  const executionPlan = input.executionPlan ?? null;
  const activeNode = pickActiveExecutionNode(
    input.blueprint,
    input.activeNodeId,
    executionPlan,
  );
  if (!activeNode) {
    return null;
  }
  const destination = readDestinationFromBlueprint(input.blueprint);
  const graph = input.blueprint.executionGraph!;
  const blockedNodeIds = readBlockedNodeIdsFromPlan(executionPlan);

  return {
    contextId: input.blueprint.contextId,
    bridgeId: input.blueprint.bridgeId,
    runtimeId: input.blueprint.runtimeId,
    containerEventId: input.blueprint.contextId,
    goal: input.blueprint.goal,
    activeNode: toNodeSummary(activeNode, input.blueprint, executionPlan),
    destinationLabel: destination.label,
    destinationResolution: destination.resolution,
    availableCapabilities: buildCapabilityOffers(activeNode),
    blockedNodeIds,
  };
}

export function readContainerAIUserLabel(
  containerKind: ContextBlueprint["containerKind"],
): string {
  return CONTAINER_AI_USER_LABELS[containerKind] ?? CONTAINER_AI_USER_LABELS.generic;
}
