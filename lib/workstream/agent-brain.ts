/**
 * Agent Brain — always-on self-state (ADR-042 / ADR-045).
 * Goal · Progress · Thinking · Risk · Next · Confidence · Verification · Commit Ready.
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
import { readLastAgentJudgment } from "@/lib/workstream/agent-judgment-chain";
import { readContextGoalState } from "@/lib/workstream/context-goal-state";
import { readAgentHealthSnapshot } from "@/lib/workstream/agent-health";
import { readGoalSupervisor } from "@/lib/workstream/goal-supervisor";
import { detectOpportunities } from "@/lib/workstream/opportunity-detector";
import { readWorldState } from "@/lib/workstream/world-state";

export type AgentBrainSnapshot = {
  readonly spine: RimvioAgentSpineSnapshot;
  readonly taskGraph: ContextTaskGraph;
  readonly goalState: IntentGoalState | null;
  readonly lastVerification: VerificationReport | null;
  readonly statusBrief: string;
  readonly goalKo: string;
  readonly progressPercent: number;
  readonly currentThinkingKo: string;
  readonly riskScore: number;
  readonly nextKo: string;
  readonly confidencePercent: number;
  readonly verificationOk: boolean | null;
  readonly commitReady: boolean;
  /** Goal Supervisor — why this % / how to raise. */
  readonly whyPercentKo: string | null;
  readonly nextToRaiseKo: string | null;
  readonly opportunityCount: number;
};

/**
 * Read Agent Brain for a Context — always knows its own state.
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
  const judgment = readLastAgentJudgment();
  const goalPersisted = readContextGoalState(input.contextEventId);
  const verification = input.lastVerification ?? null;
  const health = readAgentHealthSnapshot();
  const opps = detectOpportunities({
    contextEventId: input.contextEventId,
    world: readWorldState(input.contextEventId),
  });
  const supervisor = readGoalSupervisor({
    contextEventId: input.contextEventId,
    event: input.event,
    opportunities: opps,
  });

  const goalKo =
    goalPersisted?.goalKo ||
    goalState?.goalKo ||
    spine.contextGraph.taskGraph.goalKo ||
    "Goal";
  const progressPercent =
    supervisor?.percent ??
    goalPersisted?.percent ??
    spine.agentExecutionState.percent;
  const confidencePercent = judgment?.cost.confidence.percent ?? 70;
  const riskScore = judgment?.cost.failureRisk ?? 0;
  const currentThinkingKo =
    supervisor?.whyKo ||
    judgment?.strategy.reasonKo ||
    spine.agentExecutionState.liveHeadlineKo ||
    "대기";
  const nextKo =
    supervisor?.nextToRaiseKo ||
    spine.agentExecutionState.nextSteps[0]?.labelKo ||
    (judgment?.strategy.runVerificationLoop
      ? "Verification"
      : "다음 작업");
  const verificationOk =
    verification == null ? null : !verification.blocked && verification.ok;
  const commitReady =
    (goalPersisted?.status === "awaiting_commit" ||
      spine.agentExecutionState.status === "awaiting_commit") &&
    verificationOk !== false &&
    health.status !== "critical";

  return {
    spine,
    taskGraph,
    goalState,
    lastVerification: verification,
    statusBrief: formatAgentStatusBrief(spine.agentExecutionState),
    goalKo,
    progressPercent,
    currentThinkingKo,
    riskScore,
    nextKo,
    confidencePercent,
    verificationOk,
    commitReady,
    whyPercentKo: supervisor?.whyKo ?? null,
    nextToRaiseKo: supervisor?.nextToRaiseKo ?? null,
    opportunityCount: opps.length,
  };
}

/**
 * Verify → if blocked/warn, enter Self Repair without asking the user first.
 * Runtime default loop: Plan → Execute → Verify → Repair → Commit.
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
