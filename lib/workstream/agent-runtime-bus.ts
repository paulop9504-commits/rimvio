/**
 * Agent Runtime Event Bus — Timeline / Planner / Queue react to events (ADR-045).
 * Prefer publish over cross-module direct calls for side effects.
 */

export const AGENT_RUNTIME_EVENT_KINDS = [
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
] as const;

export type AgentRuntimeEventKind = (typeof AGENT_RUNTIME_EVENT_KINDS)[number];

export type AgentRuntimeEvent = {
  readonly id: string;
  readonly kind: AgentRuntimeEventKind;
  readonly contextEventId: string;
  readonly atIso: string;
  readonly labelKo: string;
  readonly payload?: Readonly<Record<string, unknown>>;
};

type Listener = (event: AgentRuntimeEvent) => void;

const WINDOW_EVENT = "rimvio:agent-runtime-bus";

let seq = 0;
const log: AgentRuntimeEvent[] = [];
const listeners = new Set<Listener>();

const MAX_LOG = 200;

export function publishAgentRuntimeEvent(input: {
  readonly kind: AgentRuntimeEventKind;
  readonly contextEventId: string;
  readonly labelKo: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}): AgentRuntimeEvent {
  seq += 1;
  const event: AgentRuntimeEvent = {
    id: `are:${Date.now().toString(36)}:${seq}`,
    kind: input.kind,
    contextEventId: input.contextEventId.trim(),
    atIso: new Date().toISOString(),
    labelKo: input.labelKo.trim() || input.kind,
    payload: input.payload,
  };
  log.push(event);
  if (log.length > MAX_LOG) log.splice(0, log.length - MAX_LOG);
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      /* isolate subscribers */
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WINDOW_EVENT, { detail: event }));
  }
  return event;
}

export function subscribeAgentRuntimeBus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readAgentRuntimeEventLog(input?: {
  readonly contextEventId?: string | null;
  readonly limit?: number;
}): readonly AgentRuntimeEvent[] {
  const ctx = input?.contextEventId?.trim();
  const limit = input?.limit ?? 40;
  const rows = ctx
    ? log.filter((e) => e.contextEventId === ctx)
    : log.slice();
  return rows.slice(-limit);
}

export function clearAgentRuntimeEventLogForTests(): void {
  log.length = 0;
  seq = 0;
}
