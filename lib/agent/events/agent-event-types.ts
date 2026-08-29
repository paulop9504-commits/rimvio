/**
 * P5 — Agent Event SSOT for Chat · Changes · Activity · Terminal tabs.
 */

import type { AgentIntent } from "@/lib/agent/intent/intent-types";

export type AgentEventKind =
  | "message"
  | "thinking"
  | "observation"
  | "plan_created"
  | "tool_started"
  | "tool_completed"
  | "file_changed"
  | "test_started"
  | "test_completed"
  | "verification"
  | "replan"
  | "approval_required"
  | "intent_classified"
  | "completed"
  | "error"
  | "change_explained"
  | "checkpoint_created"
  | "checkpoint_restored";

export type AgentEvent = {
  readonly id: string;
  readonly kind: AgentEventKind;
  readonly atIso: string;
  readonly label: string;
  readonly detail?: string;
  readonly meta?: Readonly<Record<string, unknown>>;
};

export type AgentEventLog = {
  readonly events: readonly AgentEvent[];
  readonly intent: AgentIntent | null;
  readonly executionStarted: boolean;
};

let seq = 0;

export function createAgentEvent(
  kind: AgentEventKind,
  label: string,
  detail?: string,
  meta?: Record<string, unknown>,
): AgentEvent {
  seq += 1;
  return {
    id: `ae-${seq}-${Date.now()}`,
    kind,
    atIso: new Date().toISOString(),
    label,
    detail,
    meta,
  };
}

export function appendAgentEvent(log: AgentEventLog, event: AgentEvent): AgentEventLog {
  return { ...log, events: [...log.events, event] };
}

export function createEmptyAgentEventLog(): AgentEventLog {
  return { events: [], intent: null, executionStarted: false };
}

/** Filter events for Activity tab (execution timeline). */
export function activityEventsFromLog(log: AgentEventLog): readonly AgentEvent[] {
  const kinds: AgentEventKind[] = [
    "intent_classified",
    "observation",
    "plan_created",
    "tool_started",
    "tool_completed",
    "test_started",
    "test_completed",
    "verification",
    "replan",
    "approval_required",
    "completed",
    "error",
    "change_explained",
    "checkpoint_created",
    "checkpoint_restored",
  ];
  return log.events.filter((e) => kinds.includes(e.kind));
}

/** Filter events for Terminal tab (tool + test lines). */
export function terminalLinesFromLog(log: AgentEventLog): readonly string[] {
  return log.events
    .filter((e) =>
      ["tool_started", "tool_completed", "test_started", "test_completed", "error"].includes(e.kind),
    )
    .map((e) => (e.detail ? `${e.label}: ${e.detail}` : e.label));
}

export type AgentChangeItem = {
  readonly id: string;
  readonly path: string;
  readonly kind: "add" | "modify";
};

/** Derive Changes tab rows from file_changed events (P5 SSOT). */
export function changesFromLog(log: AgentEventLog): readonly AgentChangeItem[] {
  const items: AgentChangeItem[] = [];
  for (const e of log.events) {
    if (e.kind !== "file_changed") continue;
    const paths = (e.meta?.paths as string[] | undefined) ?? [];
    const touch = e.meta?.touch as string | undefined;
    const kind: "add" | "modify" = touch === "created" ? "add" : "modify";
    for (const path of paths) {
      items.push({ id: `${e.id}-${path}`, path, kind });
    }
  }
  return items;
}
