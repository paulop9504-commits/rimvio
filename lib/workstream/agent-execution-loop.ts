/**
 * Agent Execution Loop helpers — Plan→…→Commit (ADR-040).
 */

import {
  RIMVIO_AGENT_EXECUTION_LOOP,
  type RimvioAgentLoopStage,
} from "@/lib/workstream/rimvio-agent-operating-law";
import type { AgentExecutionState } from "@/lib/workstream/build-agent-execution-state";
import {
  beginAgentHealing,
  finishAgentHealing,
  buildHealingPlanForScheduleConflict,
  pushAgentExecutionStep,
  setAgentExecutionHeadline,
} from "@/lib/workstream/agent-execution-session";
import {
  repairPlanFromVerification,
  verifyUsjLateArrivalDemo,
} from "@/lib/workstream/verification-agent";

export type AgentLoopCursor = {
  readonly stage: RimvioAgentLoopStage;
  readonly index: number;
};

export function nextAgentLoopStage(
  current: RimvioAgentLoopStage,
): RimvioAgentLoopStage | null {
  const i = RIMVIO_AGENT_EXECUTION_LOOP.indexOf(current);
  if (i < 0 || i >= RIMVIO_AGENT_EXECUTION_LOOP.length - 1) return null;
  return RIMVIO_AGENT_EXECUTION_LOOP[i + 1]!;
}

export function agentLoopStageLabelKo(stage: RimvioAgentLoopStage): string {
  switch (stage) {
    case "plan":
      return "계획";
    case "execute":
      return "실행";
    case "observe":
      return "관찰";
    case "verify":
      return "검증";
    case "repair":
      return "자동 수정";
    case "commit":
      return "Commit";
    default:
      return stage;
  }
}

/**
 * Format Cursor-style Agent Status brief (UI + prompt injection).
 */
export function formatAgentStatusBrief(state: AgentExecutionState): string {
  const lines: string[] = [
    "[Agent Status]",
    "",
    "Current Task:",
    state.liveHeadlineKo || state.currentTaskKo,
    "",
    `상태: ${state.status}`,
    `진행률: ${state.percent}%`,
    "",
  ];

  if (state.completedSteps.length > 0) {
    lines.push("Completed:");
    for (const s of state.completedSteps.slice(-5)) {
      lines.push(`✓ ${s.labelKo}`);
    }
    lines.push("");
  }

  if (state.runningStep) {
    lines.push("Running:");
    lines.push(`◉ ${state.runningStep.labelKo}`);
    lines.push("");
  }

  if (state.nextSteps.length > 0) {
    lines.push("Next:");
    for (const s of state.nextSteps) {
      lines.push(`○ ${s.labelKo}`);
    }
    lines.push("");
  }

  if (state.errorState) {
    lines.push("Issue:");
    lines.push(state.errorState.messageKo);
    lines.push("");
  }

  if (state.recoveryPlan && state.recoveryPlan.length > 0) {
    lines.push("Resolution:");
    for (const p of state.recoveryPlan) {
      lines.push(`✓ ${p.labelKo}`);
    }
    lines.push("");
  }

  if (state.autoResolved && state.autoResolved.length > 0) {
    lines.push("자동 처리:");
    for (const s of state.autoResolved) {
      lines.push(`✓ ${s.labelKo}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/**
 * Seed self-heal for schedule conflict — analyze → repair → verify surface.
 * Prefers Verification Agent findings when available; never asks the user first.
 */
export function runScheduleConflictSelfHeal(input: {
  readonly contextEventId: string;
  /** When true, run USJ late-arrival feasibility demo as the problem source. */
  readonly useUsjDemo?: boolean;
}): void {
  if (input.useUsjDemo) {
    const report = verifyUsjLateArrivalDemo();
    const problem =
      report.findings.find((f) => f.severity === "block")?.detailKo ||
      report.findings.find((f) => f.severity === "warn")?.detailKo ||
      "호텔 이동 시간이 일정과 충돌";
    const plan = repairPlanFromVerification(report);
    beginAgentHealing({
      problemKo: problem,
      recoveryPlan: plan.length > 0 ? [...plan] : [...buildHealingPlanForScheduleConflict().recoveryPlan],
    });
    setAgentExecutionHeadline("자동 수정 중…");
    for (const label of plan.length > 0
      ? plan
      : buildHealingPlanForScheduleConflict().recoveryPlan) {
      pushAgentExecutionStep({
        id: `heal:${label}`,
        labelKo: label,
        status: "healed",
        contextEventId: input.contextEventId,
      });
    }
    finishAgentHealing({ summaryKo: "검증 완료 · 일정 재배치" });
    return;
  }

  const plan = buildHealingPlanForScheduleConflict();
  beginAgentHealing({
    problemKo: plan.problemKo,
    recoveryPlan: [...plan.recoveryPlan],
  });
  setAgentExecutionHeadline("자동 수정 중…");
  for (const label of plan.recoveryPlan) {
    pushAgentExecutionStep({
      id: `heal:${label}`,
      labelKo: label,
      status: "healed",
      contextEventId: input.contextEventId,
    });
  }
  finishAgentHealing({ summaryKo: "검증 완료 · 일정 재배치" });
}
