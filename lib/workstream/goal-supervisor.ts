/**
 * Goal Supervisor — always ask: is the Goal done? why this %? what raises it? (ADR-046)
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  CONTEXT_WORK_SLOT_LABEL_KO,
  type ContextWorkSlotId,
} from "@/lib/workstream/context-work-state";
import {
  readContextGoalState,
  syncContextGoalState,
  type ContextGoalState,
} from "@/lib/workstream/context-goal-state";
import type { DetectedOpportunity } from "@/lib/workstream/opportunity-detector";
import type { WorkstreamState } from "@/lib/workstream/types";

export type GoalSupervisorReport = {
  readonly contextEventId: string;
  readonly goalKo: string;
  readonly percent: number;
  readonly whyKo: string;
  /** What to do next to raise progress (e.g. toward +8%). */
  readonly nextToRaiseKo: string;
  readonly targetPercent: number;
  readonly isComplete: boolean;
  readonly pendingSlots: readonly ContextWorkSlotId[];
  readonly opportunityHints: readonly string[];
};

function slotLabel(id: ContextWorkSlotId): string {
  return CONTEXT_WORK_SLOT_LABEL_KO[id] ?? id;
}

/**
 * Supervise Goal — Cursor-style "is the goal finished?"
 */
export function superviseGoal(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
  readonly workstream?: WorkstreamState | null;
  readonly goal?: ContextGoalState | null;
  readonly opportunities?: readonly DetectedOpportunity[];
}): GoalSupervisorReport {
  const contextEventId = input.contextEventId.trim();
  const goal =
    input.goal ??
    syncContextGoalState({
      contextEventId,
      event: input.event,
      workstream: input.workstream,
    });

  const completed = goal.completedSlots;
  const pending = goal.pendingSlots;
  const percent = goal.percent;
  const isComplete = goal.status === "complete" || percent >= 100;

  const doneLabels = completed.map(slotLabel);
  const pendingLabels = pending.map(slotLabel);

  const whyParts: string[] = [];
  if (doneLabels.length > 0) {
    whyParts.push(`완료 ${doneLabels.slice(0, 4).join(" · ")}`);
  }
  if (pendingLabels.length > 0) {
    whyParts.push(`미완 ${pendingLabels.slice(0, 4).join(" · ")}`);
  }
  if (whyParts.length === 0) {
    whyParts.push("필수 슬롯이 아직 비어 있음");
  }
  const whyKo = `${percent}% — ${whyParts.join(" / ")}`;

  const nextSlot = pending[0] ?? null;
  const stepGain =
    goal.requiredSlots.length > 0
      ? Math.round(100 / goal.requiredSlots.length)
      : 8;
  const targetPercent = Math.min(100, percent + Math.max(stepGain, 5));

  let nextToRaiseKo: string;
  if (isComplete) {
    nextToRaiseKo = "Goal 완료 — Reality Commit·Reflection으로 마무리";
  } else if (nextSlot) {
    nextToRaiseKo = `${slotLabel(nextSlot)} 채우면 약 ${targetPercent}%`;
  } else if (goal.status === "awaiting_commit") {
    nextToRaiseKo = "Verify 후 Reality Commit → 100%";
  } else {
    nextToRaiseKo = "다음 필수 슬롯을 채워 Goal을 올리기";
  }

  const opportunityHints = (input.opportunities ?? [])
    .slice(0, 3)
    .map((o) => o.titleKo);

  return {
    contextEventId,
    goalKo: goal.goalKo,
    percent,
    whyKo,
    nextToRaiseKo,
    targetPercent,
    isComplete,
    pendingSlots: pending,
    opportunityHints,
  };
}

export function formatGoalSupervisorBrief(
  report: GoalSupervisorReport,
): string {
  return [
    "Goal Supervisor:",
    `  Goal: ${report.goalKo}`,
    `  Progress: ${report.percent}%`,
    `  Why: ${report.whyKo}`,
    `  Next → ${report.targetPercent}%: ${report.nextToRaiseKo}`,
    report.isComplete ? "  Status: complete" : "  Status: supervising",
  ].join("\n");
}

/** Read without forcing sync when Goal already exists. */
export function readGoalSupervisor(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
  readonly opportunities?: readonly DetectedOpportunity[];
}): GoalSupervisorReport | null {
  const goal = readContextGoalState(input.contextEventId);
  if (!goal) return null;
  return superviseGoal({
    contextEventId: input.contextEventId,
    event: input.event,
    goal,
    opportunities: input.opportunities,
  });
}
