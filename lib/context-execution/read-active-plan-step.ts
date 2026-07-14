/**
 * Resolve active Execution Plan step + effective node status.
 */

import type { ExecutionGraph, ExecutionGraphNode, ExecutionNodeStatus } from "@/lib/context-blueprint/execution-graph";
import type { ContextExecutionPlanV1, ExecutionPlanStepV1 } from "@/lib/context-execution/types";

const LEGACY_ACTIVE_STATUS_PRIORITY = [
  "running",
  "ready",
  "prepared",
  "waiting_approval",
  "pending",
] as const;

export function readPlanStepByNodeId(
  plan: ContextExecutionPlanV1 | null | undefined,
  nodeId: string,
): ExecutionPlanStepV1 | null {
  if (!plan) {
    return null;
  }
  return plan.steps.find((step) => step.nodeId === nodeId) ?? null;
}

export function readPlanStepById(
  plan: ContextExecutionPlanV1 | null | undefined,
  stepId: string | null | undefined,
): ExecutionPlanStepV1 | null {
  if (!plan || !stepId) {
    return null;
  }
  return plan.steps.find((step) => step.stepId === stepId) ?? null;
}

export function readActivePlanStep(
  plan: ContextExecutionPlanV1 | null | undefined,
): ExecutionPlanStepV1 | null {
  if (!plan) {
    return null;
  }
  if (plan.currentStepId) {
    const current = readPlanStepById(plan, plan.currentStepId);
    if (current) {
      return current;
    }
  }
  for (const status of LEGACY_ACTIVE_STATUS_PRIORITY) {
    const hit = plan.steps.find((step) => step.status === status);
    if (hit) {
      return hit;
    }
  }
  return plan.steps[0] ?? null;
}

export function resolveEffectiveNodeStatus(input: {
  node: ExecutionGraphNode;
  plan: ContextExecutionPlanV1 | null | undefined;
}): ExecutionNodeStatus {
  const step = readPlanStepByNodeId(input.plan, input.node.id);
  return step?.status ?? "pending";
}

export function readActiveExecutionGraphNode(input: {
  graph: ExecutionGraph | null | undefined;
  plan?: ContextExecutionPlanV1 | null;
  activeNodeId?: string | null;
}): ExecutionGraphNode | null {
  const graph = input.graph;
  if (!graph?.nodes.length) {
    return null;
  }
  if (input.activeNodeId) {
    return graph.nodes.find((node) => node.id === input.activeNodeId) ?? null;
  }
  const activeStep = readActivePlanStep(input.plan ?? null);
  if (activeStep) {
    return graph.nodes.find((node) => node.id === activeStep.nodeId) ?? null;
  }
  return graph.nodes[0] ?? null;
}

export function readBlockedNodeIdsFromPlan(
  plan: ContextExecutionPlanV1 | null | undefined,
): string[] {
  if (!plan) {
    return [];
  }
  return plan.steps.filter((step) => step.status === "blocked").map((step) => step.nodeId);
}
