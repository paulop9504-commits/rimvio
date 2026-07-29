/**
 * Agent Brain — Execution + Verification + Intent→goal on Context Graph (ADR-042).
 * Prompts subordinate; this is the always-on layer Cursor-class agents need.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  readRimvioAgentSpineSnapshot,
  type RimvioAgentSpineSnapshot,
} from "@/lib/workstream/rimvio-agent-spine";
import {
  compileIntentToGoalState,
  type IntentGoalState,
} from "@/lib/workstream/compile-intent-to-goal-state";
import {
  repairPlanFromVerification,
  verifyScheduleFeasibility,
  type ScheduleFeasibilityInput,
  type VerificationReport,
} from "@/lib/workstream/verification-agent";
import {
  beginAgentHealing,
  finishAgentHealing,
  pushAgentExecutionStep,
  setAgentExecutionHeadline,
} from "@/lib/workstream/agent-execution-session";
import type { ContextTaskGraph } from "@/lib/workstream/build-context-task-graph";
import { formatAgentStatusBrief } from "@/lib/workstream/agent-execution-loop";

export type AgentBrainSnapshot = {
  readonly spine: RimvioAgentSpineSnapshot;
  readonly taskGraph: ContextTaskGraph;
  readonly goalState: IntentGoalState | null;
  readonly lastVerification: VerificationReport | null;
  readonly statusBrief: string;
};

/**
 * Read Agent Brain for a Context — Execution State Manager surface.
 */
export function readAgentBrainSnapshot(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
  readonly utterance?: string | null;
  readonly lastVerification?: VerificationReport | null;
}): AgentBrainSnapshot {
  const spine = readRimvioAgentSpineSnapshot({
    contextEventId: input.contextEventId,
    event: input.event,
  });
  const taskGraph = spine.contextGraph.taskGraph;
  const goalState = input.utterance?.trim()
    ? compileIntentToGoalState({ utterance: input.utterance })
    : null;
  return {
    spine,
    taskGraph,
    goalState,
    lastVerification: input.lastVerification ?? null,
    statusBrief: formatAgentStatusBrief(spine.agentExecutionState),
  };
}

/**
 * Verify → if blocked/warn, enter Self Repair without asking the user first.
 */
export function runVerificationThenRepair(input: {
  readonly contextEventId: string;
  readonly feasibility: ScheduleFeasibilityInput;
}): VerificationReport {
  const report = verifyScheduleFeasibility(input.feasibility);
  if (!report.blocked && report.ok) {
    pushAgentExecutionStep({
      id: "verify-ok",
      labelKo: "검증 통과",
      status: "done",
      contextEventId: input.contextEventId,
    });
    return report;
  }

  const problem =
    report.findings.find((f) => f.severity === "block")?.detailKo ||
    report.findings.find((f) => f.severity === "warn")?.detailKo ||
    "일정 실현 가능성 문제";
  const plan = repairPlanFromVerification(report);

  beginAgentHealing({
    problemKo: problem,
    recoveryPlan: [...plan],
  });
  setAgentExecutionHeadline("Verification → Repair");
  for (const label of plan) {
    pushAgentExecutionStep({
      id: `repair:${label}`,
      labelKo: label,
      status: "healed",
      contextEventId: input.contextEventId,
    });
  }
  finishAgentHealing({ summaryKo: "검증 후 자동 수정 완료" });
  return report;
}
