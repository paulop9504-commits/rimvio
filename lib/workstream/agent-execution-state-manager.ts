/**
 * Always-on Agent Execution State Manager (ADR-042 / Jarvis Phase 4).
 * Subscribes to runtime bus — Context Graph execution state stays alive between turns.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  readAgentBrainSnapshot,
  type AgentBrainSnapshot,
} from "@/lib/workstream/agent-brain";
import {
  buildAgentExecutionState,
  type AgentExecutionState,
} from "@/lib/workstream/build-agent-execution-state";
import { readAgentExecutionSession } from "@/lib/workstream/agent-execution-session";
import {
  subscribeAgentRuntimeBus,
  type AgentRuntimeEvent,
} from "@/lib/workstream/agent-runtime-bus";
import {
  readBackgroundTasks,
  type BackgroundTaskRecord,
} from "@/lib/workstream/background-task-dispatch";
import { readWorkstream } from "@/lib/workstream/workstream-store";

export type AgentExecutionStateSnapshot = {
  readonly contextEventId: string;
  readonly executionState: AgentExecutionState;
  readonly brain: AgentBrainSnapshot;
  readonly backgroundTasks: readonly BackgroundTaskRecord[];
  readonly lastRuntimeEvent: AgentRuntimeEvent | null;
  readonly updatedAtIso: string;
};

const snapshots = new Map<string, AgentExecutionStateSnapshot>();
let started = false;
let unsubscribe: (() => void) | null = null;

const REFRESH_KINDS = new Set<AgentRuntimeEvent["kind"]>([
  "intent_received",
  "judgment_ready",
  "goal_synced",
  "goal_supervised",
  "world_observed",
  "opportunity_detected",
  "plan_built",
  "strategy_selected",
  "hotel_selected",
  "eatery_selected",
  "schedule_updated",
  "execution_step",
  "verification_finished",
  "repair_finished",
  "queued_for_commit",
  "committed",
  "reflection_written",
  "ui_invalidate",
  "bg_task_queued",
  "bg_task_started",
  "bg_task_finished",
]);

function nowIso(): string {
  return new Date().toISOString();
}

function sessionForContext(contextEventId: string) {
  const session = readAgentExecutionSession();
  return session?.contextEventId === contextEventId ? session : null;
}

/**
 * Rebuild projection for one Context. Caller may pass `event` when available (browser).
 */
export function refreshAgentExecutionStateSnapshot(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
  readonly lastRuntimeEvent?: AgentRuntimeEvent | null;
}): AgentExecutionStateSnapshot {
  const contextEventId = input.contextEventId.trim();
  const workstream = readWorkstream(contextEventId);
  const session = sessionForContext(contextEventId);
  const executionState = buildAgentExecutionState({
    contextEventId,
    event: input.event ?? null,
    workstream,
    session,
  });
  const brain = readAgentBrainSnapshot({
    contextEventId,
    event: input.event ?? null,
  });
  const backgroundTasks = readBackgroundTasks({ contextEventId, limit: 8 });
  const prev = snapshots.get(contextEventId);
  const snapshot: AgentExecutionStateSnapshot = {
    contextEventId,
    executionState,
    brain,
    backgroundTasks,
    lastRuntimeEvent:
      input.lastRuntimeEvent ?? prev?.lastRuntimeEvent ?? null,
    updatedAtIso: nowIso(),
  };
  snapshots.set(contextEventId, snapshot);
  return snapshot;
}

export function readAgentExecutionStateSnapshot(
  contextEventId: string,
): AgentExecutionStateSnapshot | null {
  return snapshots.get(contextEventId.trim()) ?? null;
}

export function touchAgentExecutionStateManager(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) return;
  if (snapshots.has(id)) {
    refreshAgentExecutionStateSnapshot({ contextEventId: id });
    return;
  }
  ensureAgentExecutionStateManager();
  refreshAgentExecutionStateSnapshot({ contextEventId: id });
}

function onRuntimeEvent(event: AgentRuntimeEvent): void {
  if (!REFRESH_KINDS.has(event.kind)) return;
  const id = event.contextEventId.trim();
  if (!id) return;
  refreshAgentExecutionStateSnapshot({
    contextEventId: id,
    lastRuntimeEvent: event,
  });
}

/**
 * Idempotent — wire once per app session (client) or test suite.
 */
export function ensureAgentExecutionStateManager(): void {
  if (started) return;
  started = true;
  unsubscribe = subscribeAgentRuntimeBus(onRuntimeEvent);
}

export function stopAgentExecutionStateManagerForTests(): void {
  unsubscribe?.();
  unsubscribe = null;
  started = false;
  snapshots.clear();
}

export function readAllAgentExecutionStateSnapshots(): readonly AgentExecutionStateSnapshot[] {
  return [...snapshots.values()];
}
