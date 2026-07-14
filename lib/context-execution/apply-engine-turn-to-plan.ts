/**
 * Apply Engine lifecycle events to ContextExecutionPlan step status (L3 Runtime).
 */

import { advanceContextExecutionPlanStep } from "@/lib/context-execution/advance-plan-step";
import { readContextExecutionPlanFromMetadata } from "@/lib/context-execution/context-execution-plan-metadata";
import { syncContextExecutionPlanMetadata } from "@/lib/context-execution/sync-context-execution-plan-metadata";
import type {
  ContextExecutionPlanV1,
  ExecutionPlanStepStatus,
} from "@/lib/context-execution/types";
import type { RimvioEngineEventKind } from "@/lib/engine/engine-event-metadata";
import { primaryExecutionNodeForEngine } from "@/lib/engine/execution-graph-engine-bindings";
import type { RimvioEngineId } from "@/lib/engine/engine-types";

export function resolveExecutionNodeIdForEngineTurn(input: {
  engineId: RimvioEngineId;
  executionNodeId?: string | null;
}): string | null {
  const explicit = input.executionNodeId?.trim();
  if (explicit) {
    return explicit;
  }
  return primaryExecutionNodeForEngine(input.engineId);
}

function resolveStepStatusForEngineEvent(input: {
  kind: RimvioEngineEventKind;
  lastError?: string | null;
}): { status: ExecutionPlanStepStatus; lastError: string | null } | null {
  switch (input.kind) {
    case "scout_failed":
      return {
        status: "blocked",
        lastError: input.lastError?.trim() || "scout_failed",
      };
    case "scout_complete":
      return { status: "prepared", lastError: null };
    case "main_selected":
      return { status: "prepared", lastError: null };
    default:
      return null;
  }
}

export function applyEngineTurnToExecutionPlanMetadata(input: {
  metadata: Record<string, unknown>;
  engineId: RimvioEngineId;
  kind: RimvioEngineEventKind;
  executionNodeId?: string | null;
  lastError?: string | null;
}): { metadata: Record<string, unknown>; plan: ContextExecutionPlanV1 | null; changed: boolean } {
  const plan = readContextExecutionPlanFromMetadata(input.metadata);
  if (!plan) {
    return { metadata: input.metadata, plan: null, changed: false };
  }

  const nodeId = resolveExecutionNodeIdForEngineTurn(input);
  if (!nodeId) {
    return { metadata: input.metadata, plan, changed: false };
  }

  const resolved = resolveStepStatusForEngineEvent({
    kind: input.kind,
    lastError: input.lastError,
  });
  if (!resolved) {
    return { metadata: input.metadata, plan, changed: false };
  }

  const advanced = advanceContextExecutionPlanStep({
    plan,
    nodeId,
    status: resolved.status,
    lastError: resolved.lastError,
  });

  const sync = syncContextExecutionPlanMetadata({
    metadata: input.metadata,
    plan: advanced,
  });

  return {
    metadata: sync.metadata,
    plan: advanced,
    changed: sync.changed,
  };
}
