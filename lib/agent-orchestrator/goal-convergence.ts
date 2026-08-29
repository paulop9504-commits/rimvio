/**
 * Goal Convergence — plan complete ≠ goal satisfied (P8).
 */

import type { PlanDAG } from "@/lib/reality-planner/types";
import type { ActionPlanV1 } from "@/lib/action-planner/types";
import type { AgentObservation } from "@/lib/agent/types";
import type { AgentGoal } from "@/lib/agent-orchestrator/execution-context";

export type GoalConvergenceStatus =
  | "satisfied"
  | "partial"
  | "blocked"
  | "needs_more_work";

export type GoalConvergenceResult = {
  readonly status: GoalConvergenceStatus;
  readonly summaryKo: string;
  readonly missing: readonly string[];
};

export function evaluateGoalConvergence(input: {
  readonly goal: AgentGoal;
  readonly planDag?: PlanDAG | null;
  readonly actionPlan?: ActionPlanV1 | null;
  readonly observations: readonly AgentObservation[];
}): GoalConvergenceResult {
  const missing: string[] = [];
  const utterance = input.goal.summaryKo.toLowerCase();

  const hasLodgingCandidates = input.observations.some(
    (o) =>
      o.success &&
      (o.stepKind === "resolve_entity" || o.stepKind === "tool") &&
      ((o.candidates?.length ?? 0) > 0 || Boolean(o.selected)),
  );

  const waitingCommit = input.observations.some((o) => o.stepKind === "wait_commit" && o.success);
  const planNodesDone =
    input.planDag?.nodes.filter((n) => n.kind === "task").every((n) => n.status === "done") ?? false;
  const actionStepsPending =
    input.actionPlan?.steps.some((s) => s.status === "pending") ?? false;

  const wantsLodging = /숙소|호텔|hotel|lodging|여행\s*준비|trip/i.test(utterance);
  const wantsActivity = /usj|유니버설|activity|액티비티|일정/i.test(utterance);
  const wantsItinerary = /일정|itinerary|짜/i.test(utterance);

  if (wantsLodging && !hasLodgingCandidates) {
    missing.push("lodging_candidates");
  }
  if (wantsActivity && !input.observations.some((o) => /activity|usj/i.test(o.summaryKo ?? ""))) {
    missing.push("activity");
  }
  if (wantsItinerary && missing.length > 0) {
    missing.push("itinerary");
  }

  if (waitingCommit) {
    return {
      status: "partial",
      summaryKo: "예약 준비 완료 — 사용자 승인 대기",
      missing: ["human_commit"],
    };
  }

  if (missing.length === 0 && (hasLodgingCandidates || planNodesDone)) {
    return {
      status: "satisfied",
      summaryKo: "Goal 충족",
      missing: [],
    };
  }

  if (planNodesDone && missing.length > 0) {
    return {
      status: "needs_more_work",
      summaryKo: `Plan 완료 · Goal 미충족: ${missing.join(", ")}`,
      missing,
    };
  }

  if (actionStepsPending || (input.planDag && input.planDag.status === "executing")) {
    return {
      status: "needs_more_work",
      summaryKo: "진행 중",
      missing,
    };
  }

  if (missing.length > 0) {
    return {
      status: "partial",
      summaryKo: `부분 완료: ${missing.join(", ")}`,
      missing,
    };
  }

  return {
    status: "blocked",
    summaryKo: "Goal 상태 불명",
    missing,
  };
}
