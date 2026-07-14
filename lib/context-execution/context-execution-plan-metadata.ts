/**
 * EventCandidate.metadata wire for ContextExecutionPlanV1.
 */

import type { ContextExecutionPlanV1, ExecutionPlanStepV1 } from "@/lib/context-execution/types";
import { EXECUTION_PLAN_APPROVALS } from "@/lib/context-execution/types";
import { CONTEXT_RUN_STATES } from "@/lib/context-blueprint/context-run-state";
import { EXECUTION_NODE_STATUSES } from "@/lib/context-blueprint/execution-graph";
import { isRimvioEngineId } from "@/lib/engine/context-installed-engines-metadata";
import type { EventCandidate } from "@/lib/events/event-candidate";

export const CONTEXT_EXECUTION_PLAN_META_KEY = "contextExecutionPlanV1" as const;

function parseStep(raw: unknown): ExecutionPlanStepV1 | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Partial<ExecutionPlanStepV1>;
  if (
    typeof row.stepId !== "string" ||
    !row.stepId.trim() ||
    typeof row.nodeId !== "string" ||
    typeof row.order !== "number" ||
    !Number.isFinite(row.order) ||
    typeof row.labelKo !== "string" ||
    typeof row.status !== "string" ||
    !EXECUTION_NODE_STATUSES.includes(row.status as ExecutionPlanStepV1["status"])
  ) {
    return null;
  }
  const engineId =
    row.engineId == null
      ? null
      : typeof row.engineId === "string" && isRimvioEngineId(row.engineId)
        ? row.engineId
        : null;
  return {
    stepId: row.stepId.trim(),
    nodeId: row.nodeId.trim(),
    order: row.order,
    labelKo: row.labelKo.trim(),
    engineId,
    status: row.status as ExecutionPlanStepV1["status"],
    lastError: typeof row.lastError === "string" ? row.lastError : null,
    updatedAtIso: typeof row.updatedAtIso === "string" ? row.updatedAtIso : null,
  };
}

export function parseContextExecutionPlan(raw: unknown): ContextExecutionPlanV1 | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Partial<ContextExecutionPlanV1>;
  if (row.version !== 1) {
    return null;
  }
  if (
    typeof row.contextId !== "string" ||
    !row.contextId.trim() ||
    typeof row.goalKo !== "string" ||
    typeof row.osPhase !== "string" ||
    !CONTEXT_RUN_STATES.includes(row.osPhase as ContextExecutionPlanV1["osPhase"]) ||
    typeof row.approval !== "string" ||
    !EXECUTION_PLAN_APPROVALS.includes(row.approval as ContextExecutionPlanV1["approval"]) ||
    typeof row.createdAtIso !== "string" ||
    typeof row.updatedAtIso !== "string" ||
    !Array.isArray(row.steps)
  ) {
    return null;
  }
  const steps = row.steps
    .map((step) => parseStep(step))
    .filter((step): step is ExecutionPlanStepV1 => step != null)
    .sort((left, right) => left.order - right.order);
  if (steps.length === 0) {
    return null;
  }
  const currentStepId =
    row.currentStepId == null
      ? null
      : typeof row.currentStepId === "string" && row.currentStepId.trim()
        ? row.currentStepId.trim()
        : null;
  return {
    version: 1,
    contextId: row.contextId.trim(),
    goalKo: row.goalKo.trim(),
    osPhase: row.osPhase as ContextExecutionPlanV1["osPhase"],
    approval: row.approval as ContextExecutionPlanV1["approval"],
    steps,
    currentStepId,
    createdAtIso: row.createdAtIso,
    updatedAtIso: row.updatedAtIso,
  };
}

export function readContextExecutionPlanFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ContextExecutionPlanV1 | null {
  if (!metadata) {
    return null;
  }
  return parseContextExecutionPlan(metadata[CONTEXT_EXECUTION_PLAN_META_KEY]);
}

export function readContextExecutionPlanFromEvent(
  event: EventCandidate | null | undefined,
): ContextExecutionPlanV1 | null {
  if (!event?.metadata || typeof event.metadata !== "object") {
    return null;
  }
  return readContextExecutionPlanFromMetadata(event.metadata as Record<string, unknown>);
}

export function applyContextExecutionPlanToMetadata(input: {
  metadata: Record<string, unknown>;
  plan: ContextExecutionPlanV1;
}): Record<string, unknown> {
  return {
    ...input.metadata,
    [CONTEXT_EXECUTION_PLAN_META_KEY]: input.plan,
  };
}
