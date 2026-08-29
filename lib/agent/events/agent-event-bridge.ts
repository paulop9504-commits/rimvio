/**
 * Maps Hub Agent Controller / Loop events → AgentEvent SSOT (P5).
 */

import type { HubAgentControllerEvent } from "@/lib/hub/dev/hub-agent-controller";
import type { ChangeExplanation } from "@/lib/hub/dev/hub-change-explanation";
import { summarizeChangeExplanation } from "@/lib/hub/dev/hub-change-explanation";
import {
  appendAgentEvent,
  createAgentEvent,
  createEmptyAgentEventLog,
  type AgentEvent,
  type AgentEventLog,
} from "@/lib/agent/events/agent-event-types";
import type { AgentIntent } from "@/lib/agent/intent/intent-types";

export function applyControllerEventToLog(
  log: AgentEventLog,
  event: HubAgentControllerEvent,
): AgentEventLog {
  let next = log;
  let agentEvent: AgentEvent | null = null;

  switch (event.type) {
    case "intent":
      next = {
        ...next,
        intent: event.intent,
        executionStarted: event.executable && event.intent !== "chat" && event.intent !== "question",
      };
      agentEvent = createAgentEvent(
        "intent_classified",
        `Intent: ${event.intent}`,
        event.executable ? "executable" : "conversational",
        { intent: event.intent },
      );
      break;
    case "conversational":
      agentEvent = createAgentEvent("message", event.body.slice(0, 80), event.body);
      break;
    case "text":
      agentEvent = createAgentEvent("message", event.body.slice(0, 60), event.body);
      break;
    case "observe":
      agentEvent = createAgentEvent(
        "observation",
        "Workspace observed",
        event.lines.join(" · "),
        { lines: event.lines },
      );
      break;
    case "plan":
      agentEvent = createAgentEvent(
        "plan_created",
        event.goal.slice(0, 60),
        `${event.steps.length} steps`,
        { steps: event.steps },
      );
      break;
    case "tool":
      agentEvent = createAgentEvent(
        event.status === "running" ? "tool_started" : "tool_completed",
        event.label,
        event.detail,
        { toolId: event.toolId, status: event.status },
      );
      break;
    case "file_touch":
      agentEvent = createAgentEvent(
        "file_changed",
        event.paths.join(", "),
        event.touch,
        { paths: event.paths, touch: event.touch },
      );
      break;
    case "test_result":
      agentEvent = createAgentEvent(
        event.running ? "test_started" : "test_completed",
        `Tests ${event.passed}/${event.total}`,
        event.running ? "running" : "done",
      );
      break;
    case "verify":
      agentEvent = createAgentEvent("verification", event.detail, event.ok ? "pass" : "fail", {
        ok: event.ok,
      });
      break;
    case "replan":
      agentEvent = createAgentEvent("replan", event.reason, undefined);
      break;
    case "ask_user":
      agentEvent = createAgentEvent("approval_required", event.message, event.actionLabel, {
        actionId: event.actionId,
      });
      break;
    case "complete":
      agentEvent = createAgentEvent("completed", event.summary, undefined);
      break;
    case "phase":
      agentEvent = createAgentEvent("thinking", event.phase, event.detail);
      break;
    default:
      break;
  }

  if (agentEvent) {
    next = appendAgentEvent(next, agentEvent);
  }
  return next;
}

/** Capability #93 — Emit change explanation events for Changes tab + Activity. */
export function applyChangeExplanationsToLog(
  log: AgentEventLog,
  explanations: readonly ChangeExplanation[],
): AgentEventLog {
  if (explanations.length === 0) return log;
  const rollup = summarizeChangeExplanation(explanations);
  let next = appendAgentEvent(
    log,
    createAgentEvent("change_explained", rollup, explanations.map((e) => e.whyKo).join(" · "), {
      explanations,
    }),
  );
  for (const ex of explanations.slice(0, 5)) {
    next = appendAgentEvent(
      next,
      createAgentEvent("change_explained", ex.summaryKo, ex.impactKo, { changeId: ex.changeId }),
    );
  }
  return next;
}

/** Capability #94/#95 — Checkpoint events for audit trail. */
export function applyCheckpointEventToLog(
  log: AgentEventLog,
  kind: "checkpoint_created" | "checkpoint_restored",
  label: string,
  checkpointId: string,
): AgentEventLog {
  return appendAgentEvent(log, createAgentEvent(kind, label, checkpointId, { checkpointId }));
}

export function createAgentEventLogFromIntent(intent: AgentIntent): AgentEventLog {
  const log = createEmptyAgentEventLog();
  return applyControllerEventToLog(log, {
    type: "intent",
    intent,
    executable: intent !== "chat" && intent !== "question",
  });
}
