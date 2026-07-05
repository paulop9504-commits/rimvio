/**
 * Container AI — reads Execution Graph for every user turn.
 * Container AI is the Operator; Globe AI is the Architect.
 * @see docs/RIMVIO_CONTAINER_AI.md
 */

import type { ContextBlueprint } from "@/lib/context-blueprint/types";
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
): ExecutionGraphNode | null {
  const graph = blueprint.executionGraph;
  if (!graph) {
    return null;
  }
  if (activeNodeId) {
    return graph.nodes.find((row) => row.id === activeNodeId) ?? null;
  }
  const priority = ["running", "ready", "prepared", "waiting_approval", "pending"];
  for (const status of priority) {
    const hit = graph.nodes.find((row) => row.status === status);
    if (hit) {
      return hit;
    }
  }
  return graph.nodes[0] ?? null;
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
): ContainerAINodeSummary {
  const spatial = blueprint.spatialTargets
    ? readSpatialTargetForNode(blueprint.spatialTargets, node.id)
    : null;
  return {
    nodeId: node.id,
    kind: node.kind,
    label: node.label,
    status: node.status,
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
}): ContainerAIContext | null {
  const activeNode = pickActiveExecutionNode(input.blueprint, input.activeNodeId);
  if (!activeNode) {
    return null;
  }
  const destination = readDestinationFromBlueprint(input.blueprint);
  const graph = input.blueprint.executionGraph!;
  const blockedNodeIds = graph.nodes
    .filter((row) => row.status === "blocked")
    .map((row) => row.id);

  return {
    contextId: input.blueprint.contextId,
    bridgeId: input.blueprint.bridgeId,
    runtimeId: input.blueprint.runtimeId,
    containerEventId: input.blueprint.contextId,
    goal: input.blueprint.goal,
    activeNode: toNodeSummary(activeNode, input.blueprint),
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
