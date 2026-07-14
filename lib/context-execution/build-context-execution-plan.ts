/**
 * Compose ContextExecutionPlanV1 from L2 Blueprint (structure only).
 */

import type { ExecutionGraph, ExecutionGraphNode } from "@/lib/context-blueprint/execution-graph";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import { resolveEngineForExecutionNode } from "@/lib/engine/execution-graph-engine-bindings";
import type {
  BuildContextExecutionPlanInput,
  ContextExecutionPlanV1,
  ExecutionPlanStepV1,
} from "@/lib/context-execution/types";

const ACTIVE_STEP_STATUS_PRIORITY = [
  "running",
  "ready",
  "prepared",
  "waiting_approval",
  "pending",
] as const;

function orderExecutionNodes(graph: ExecutionGraph): ExecutionGraphNode[] {
  if (graph.edges.length === 0) {
    return [...graph.nodes];
  }
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, number>();
  for (const node of graph.nodes) {
    incoming.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    incoming.set(edge.toNodeId, (incoming.get(edge.toNodeId) ?? 0) + 1);
  }
  const queue = graph.nodes
    .filter((node) => (incoming.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  const orderedIds: string[] = [];
  const edgesByFrom = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = edgesByFrom.get(edge.fromNodeId) ?? [];
    list.push(edge.toNodeId);
    edgesByFrom.set(edge.fromNodeId, list);
  }
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (orderedIds.includes(nodeId)) {
      continue;
    }
    orderedIds.push(nodeId);
    for (const nextId of edgesByFrom.get(nodeId) ?? []) {
      incoming.set(nextId, (incoming.get(nextId) ?? 0) - 1);
      if ((incoming.get(nextId) ?? 0) <= 0) {
        queue.push(nextId);
      }
    }
  }
  for (const node of graph.nodes) {
    if (!orderedIds.includes(node.id)) {
      orderedIds.push(node.id);
    }
  }
  return orderedIds
    .map((nodeId) => byId.get(nodeId))
    .filter((node): node is ExecutionGraphNode => node != null);
}

function composeStepId(nodeId: string, order: number): string {
  return `${nodeId}:${order}`;
}

function resolveCurrentStepId(steps: readonly ExecutionPlanStepV1[]): string | null {
  for (const status of ACTIVE_STEP_STATUS_PRIORITY) {
    const hit = steps.find((step) => step.status === status);
    if (hit) {
      return hit.stepId;
    }
  }
  return steps[0]?.stepId ?? null;
}

function stepFromNode(node: ExecutionGraphNode, order: number, nowIso: string): ExecutionPlanStepV1 {
  const engineId = resolveEngineForExecutionNode(node.id, node.assignedExecutor);
  return {
    stepId: composeStepId(node.id, order),
    nodeId: node.id,
    order,
    labelKo: node.label,
    engineId,
    status: "pending",
    lastError: null,
    updatedAtIso: nowIso,
  };
}

export function buildContextExecutionPlanFromBlueprint(input: {
  blueprint: ContextBlueprint;
  build: BuildContextExecutionPlanInput;
}): ContextExecutionPlanV1 | null {
  const graph = input.blueprint.executionGraph;
  if (!graph?.nodes.length) {
    return null;
  }
  const now = input.build.now ?? new Date();
  const nowIso = now.toISOString();
  const orderedNodes = orderExecutionNodes(graph);
  const steps = orderedNodes.map((node, index) => stepFromNode(node, index, nowIso));
  const osPhase = input.build.osPhase ?? "execution_planned";
  const approval = input.build.approval ?? "auto";
  return {
    version: 1,
    contextId: input.build.contextId.trim(),
    goalKo: input.build.goalKo.trim() || input.blueprint.goal.trim(),
    osPhase,
    approval,
    steps,
    currentStepId: resolveCurrentStepId(steps),
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
  };
}
