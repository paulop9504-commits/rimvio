/**
 * Agent Turn events → existing AgentEvent SSOT.
 */

import {
  appendAgentEvent,
  createAgentEvent,
  type AgentEventKind,
  type AgentEventLog,
} from "@/lib/agent/events/agent-event-types";
import type { AgentTurnEvent, AgentTurnEventKind } from "@/lib/agent-os/agent-turn/types";

const KIND_TO_AGENT: Readonly<Record<AgentTurnEventKind, AgentEventKind>> = {
  AGENT_STARTED: "agent_started",
  INTENT_DETECTED: "intent_classified",
  GOAL_CREATED: "intent_classified",
  STATE_INSPECTION_STARTED: "inspection_started",
  STATE_INSPECTION_COMPLETED: "observation",
  CAPABILITIES_DISCOVERED: "observation",
  INSPECTION_STARTED: "inspection_started",
  PLAN_CREATED: "plan_created",
  ACTION_SELECTED: "thinking",
  ACTION_STARTED: "tool_started",
  ACTION_COMPLETED: "tool_completed",
  OBSERVATION_CREATED: "observation",
  VERIFICATION_STARTED: "verification_started",
  VERIFICATION_PASSED: "verification_passed",
  VERIFICATION_FAILED: "verification_failed",
  FAILURE_CLASSIFIED: "error",
  ALTERNATIVES_GENERATED: "replan",
  REPLAN_STARTED: "replan",
  REPLAN_COMPLETED: "replan",
  WAITING_FOR_APPROVAL: "approval_required",
  AGENT_PAUSED: "agent_paused",
  AGENT_COMPLETED: "completed",
  AGENT_FAILED: "agent_failed",
  FINAL_REPORT_CREATED: "final_report_created",
};

export function createAgentTurnEvent(
  kind: AgentTurnEventKind,
  labelKo: string,
  detail?: string,
  meta?: Record<string, unknown>,
): AgentTurnEvent {
  return {
    kind,
    atIso: new Date().toISOString(),
    labelKo,
    detail,
    meta,
  };
}

export function applyAgentTurnEventToLog(
  log: AgentEventLog,
  event: AgentTurnEvent,
): AgentEventLog {
  return appendAgentEvent(
    log,
    createAgentEvent(KIND_TO_AGENT[event.kind], event.labelKo, event.detail, {
      turnEvent: event.kind,
      ...event.meta,
    }),
  );
}

export function progressItemsFromTurn(input: {
  readonly steps: readonly { readonly label: string; readonly status: "done" | "running" | "pending" | "failed" }[];
}): readonly { readonly label: string; readonly status: "done" | "running" | "pending" }[] {
  return input.steps.map((s) => ({
    label: s.label,
    status: s.status === "failed" ? "pending" : s.status,
  }));
}
