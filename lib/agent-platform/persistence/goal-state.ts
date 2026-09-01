/**
 * Goal state persistence — server durable + client bridge for resume ("계속해").
 */

import type { PersistedGoalState } from "../types";
import { readServerGoalState, writeServerGoalState } from "./durable-store";

export function createInitialGoalState(input: {
  readonly contextEventId: string;
  readonly goalKo: string;
  readonly utterance?: string | null;
  readonly capabilityId?: string | null;
}): PersistedGoalState {
  const now = new Date().toISOString();
  return {
    contextEventId: input.contextEventId,
    goalKo: input.goalKo,
    goalId: `goal:${input.contextEventId}`,
    percent: input.capabilityId ? 20 : 5,
    status: "active",
    pendingCapabilityIds: input.capabilityId ? [input.capabilityId] : [],
    completedCapabilityIds: [],
    lastExecutionId: null,
    utterance: input.utterance ?? null,
    updatedAtIso: now,
  };
}

export function markCapabilityCompletedInGoal(input: {
  readonly contextEventId: string;
  readonly capabilityId: string;
  readonly executionId: string;
  readonly ok: boolean;
}): PersistedGoalState {
  const prev =
    readServerGoalState(input.contextEventId) ??
    createInitialGoalState({
      contextEventId: input.contextEventId,
      goalKo: "Dev Hub 작업",
      capabilityId: input.capabilityId,
    });

  const completed = new Set(prev.completedCapabilityIds);
  const pending = new Set(prev.pendingCapabilityIds);
  pending.delete(input.capabilityId);
  if (input.ok) {
    completed.add(input.capabilityId);
  }

  const total = completed.size + pending.size;
  const percent = total === 0 ? (input.ok ? 100 : prev.percent) : Math.round((completed.size / total) * 100);

  const next: PersistedGoalState = {
    ...prev,
    completedCapabilityIds: [...completed],
    pendingCapabilityIds: [...pending],
    lastExecutionId: input.executionId,
    percent,
    status: percent >= 100 ? "complete" : input.ok ? "active" : "blocked",
    updatedAtIso: new Date().toISOString(),
  };
  return writeServerGoalState(next);
}

export function readPersistedGoalState(contextEventId: string): PersistedGoalState | null {
  return readServerGoalState(contextEventId);
}

export function syncPersistedGoalState(state: PersistedGoalState): PersistedGoalState {
  return writeServerGoalState(state);
}

export function resumeGoalWorkLog(contextEventId: string): string | null {
  const goal = readServerGoalState(contextEventId);
  if (!goal) return null;
  if (goal.status === "complete") {
    return `${goal.goalKo} · 완료 (${goal.percent}%)`;
  }
  const pending = goal.pendingCapabilityIds[0];
  const loopHint = goal.compositeLoopId ? ` · ${goal.compositeLoopId}` : "";
  return pending
    ? `${goal.goalKo} · ${goal.percent}% · 다음: ${pending}${loopHint}`
    : `${goal.goalKo} · ${goal.percent}%${loopHint}`;
}

export function initGoalPipeline(input: {
  readonly contextEventId: string;
  readonly goalKo: string;
  readonly pipelineCapabilityIds: readonly string[];
  readonly compositeLoopId?: string | null;
  readonly stepIndex?: number;
  readonly utterance?: string | null;
}): PersistedGoalState {
  const completed = (input.pipelineCapabilityIds ?? []).slice(0, input.stepIndex ?? 0);
  const pending = (input.pipelineCapabilityIds ?? []).slice(input.stepIndex ?? 0);
  const total = input.pipelineCapabilityIds.length;
  const percent = total === 0 ? 0 : Math.round((completed.length / total) * 100);

  return writeServerGoalState({
    contextEventId: input.contextEventId,
    goalKo: input.goalKo,
    goalId: `goal:${input.contextEventId}`,
    percent,
    status: percent >= 100 ? "complete" : "active",
    completedCapabilityIds: completed,
    pendingCapabilityIds: pending,
    lastExecutionId: null,
    utterance: input.utterance ?? null,
    updatedAtIso: new Date().toISOString(),
    pipelineCapabilityIds: input.pipelineCapabilityIds,
    pipelineStepIndex: input.stepIndex ?? 0,
    compositeLoopId: input.compositeLoopId ?? null,
  });
}

export function advanceGoalPipeline(input: {
  readonly contextEventId: string;
  readonly stepIndex: number;
  readonly capabilityId: string;
  readonly executionId: string;
  readonly ok: boolean;
}): PersistedGoalState {
  const prev =
    readServerGoalState(input.contextEventId) ??
    createInitialGoalState({
      contextEventId: input.contextEventId,
      goalKo: "Pipeline",
      capabilityId: input.capabilityId,
    });

  const pipeline = prev.pipelineCapabilityIds ?? [input.capabilityId];
  const completed = new Set(prev.completedCapabilityIds);
  if (input.ok) {
    completed.add(input.capabilityId);
  }
  const pending = pipeline.filter((id) => !completed.has(id));

  const percent =
    pipeline.length === 0 ? 0 : Math.round((completed.size / pipeline.length) * 100);

  return writeServerGoalState({
    ...prev,
    completedCapabilityIds: [...completed],
    pendingCapabilityIds: pending,
    pipelineStepIndex: input.ok ? input.stepIndex + 1 : input.stepIndex,
    lastExecutionId: input.executionId,
    percent,
    status: percent >= 100 ? "complete" : input.ok ? "active" : "blocked",
    updatedAtIso: new Date().toISOString(),
  });
}
