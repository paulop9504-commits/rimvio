/**
 * Sandbox completion → Goal State · composite pipeline advance (verify mandatory).
 */

import type { SandboxSession } from "@/lib/sandbox/types";
import {
  advanceGoalPipeline,
  markCapabilityCompletedInGoal,
  readPersistedGoalState,
} from "../persistence/goal-state";
import { persistSandboxSessionSnapshot } from "../persistence/durable-store";

function resolveContextEventId(session: SandboxSession): string | null {
  const input = session.input;
  if (typeof input.contextEventId === "string" && input.contextEventId.trim()) {
    return input.contextEventId.trim();
  }
  if (typeof input.workspaceId === "string" && input.workspaceId.trim()) {
    return input.workspaceId.trim();
  }
  return null;
}

/**
 * Called when a sandbox session reaches a terminal lifecycle (COMPLETED / FAILED).
 */
export function handleSandboxSessionCompleted(session: SandboxSession): void {
  persistSandboxSessionSnapshot(session);

  const contextEventId = resolveContextEventId(session);
  if (!contextEventId) return;

  const verified = session.verification?.ok === true;
  const capabilityId = session.capability;

  markCapabilityCompletedInGoal({
    contextEventId,
    capabilityId,
    executionId: session.executionId,
    ok: verified && session.lifecycleStatus === "COMPLETED",
  });

  const goal = readPersistedGoalState(contextEventId);
  if (!goal?.compositeLoopId || !goal.pipelineCapabilityIds?.length) return;

  const stepIndex = goal.pipelineStepIndex ?? goal.completedCapabilityIds.length;
  const expectedCap = goal.pipelineCapabilityIds[stepIndex];
  if (expectedCap !== capabilityId) return;

  advanceGoalPipeline({
    contextEventId,
    stepIndex,
    capabilityId,
    executionId: session.executionId,
    ok: verified && session.lifecycleStatus === "COMPLETED",
  });
}
