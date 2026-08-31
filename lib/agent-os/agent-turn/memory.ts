/**
 * Persist last Agent Turn onto Operator conversation memory.
 */

import {
  rememberOperatorFocus,
  writeOperatorMemory,
  type OperatorConversationMemory,
} from "@/lib/hub/dev/conversation-memory";
import type { AgentFinalReport, AgentTurn, AgentTurnUnderstand } from "@/lib/agent-os/agent-turn/types";

export function rememberAgentTurn(input: {
  readonly platformId: string;
  readonly understand: AgentTurnUnderstand | null;
  readonly turn: AgentTurn;
  readonly report: AgentFinalReport;
}): OperatorConversationMemory {
  const changedCaps = [
    ...new Set(
      input.turn.actions
        .filter((a) => a.status === "success" && a.capability)
        .map((a) => a.capability as string),
    ),
  ];
  const objects = input.turn.inspection?.entities ?? [];

  rememberOperatorFocus(input.platformId, {
    goal: input.understand?.requestedOutcome ?? input.turn.request,
    task: input.understand?.action ?? input.turn.request,
    utterance: input.turn.request,
    capabilities: changedCaps.length ? changedCaps : input.turn.inspection?.capabilities,
    objects,
    workInProgress: input.report.status === "waiting" || input.report.status === "paused",
  });

  return writeOperatorMemory(input.platformId, {
    latestTask: input.understand?.action ?? input.turn.request,
    latestResult:
      input.report.status === "success"
        ? "success"
        : input.report.status === "failed"
          ? "failed"
          : "partial",
    latestChangedCapabilities: changedCaps,
    latestVerification: input.report.verified ? "passed" : input.turn.verification?.ran ? "failed" : "skipped",
  });
}
