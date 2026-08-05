/**
 * L9 Conflict Replan — one alternate remaining trail after conflict / step fail.
 * Never Reality-Commit; human Wait after replan.
 */

import {
  WORKSPACE_AGENT_PLAN_VERSION,
  type WorkspaceAgentPlan,
  type WorkspaceAgentPlanStep,
} from "@/lib/context-run/workspace-agent-plan";
import type { WorkspacePlanConflict } from "@/lib/context-run/detect-workspace-plan-conflict";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";

function mk(
  index: number,
  labelKo: string,
  utterance: string,
  noteKo: string,
): WorkspaceAgentPlanStep {
  return {
    id: `ws_replan_${index + 1}`,
    kind: "workspace_patch",
    labelKo,
    utterance,
    status: "pending",
    noteKo,
    expect: { workspaceMutated: true },
    observation: null,
  };
}

/**
 * Build replacement steps for unresolved plan work (max one replan).
 */
export function compileConflictReplanSteps(input: {
  readonly plan: WorkspaceAgentPlan;
  readonly conflict: WorkspacePlanConflict | null;
  readonly failedStep: WorkspaceAgentPlanStep | null;
}): readonly WorkspaceAgentPlanStep[] | null {
  const day =
    input.conflict?.dayIndex != null
      ? input.conflict.dayIndex + 1
      : Number(
          input.plan.sourceUtterance.match(
            /(?:day\s*|데이\s*)?(\d+)\s*(?:일차|일)?/iu,
          )?.[1] ?? "1",
        );

  if (input.conflict?.kind === "duplicate_lodging_day") {
    const state = input.plan.contextEventId
      ? readContextWorkspace(input.plan.contextEventId)
      : null;
    const secondId = input.conflict.nodeIds[1];
    const secondTitle =
      state?.nodes.find((n) => n.id === secondId)?.title?.trim() || "호텔";
    return [
      mk(
        0,
        `Day ${day} · 중복 숙소 정리`,
        `Day ${day}에서 ${secondTitle} 빼줘`,
        "replan · duplicate lodging",
      ),
      mk(
        1,
        `Day ${day} 동선 다시`,
        `Day ${day} 이동 동선 다시 짜줘`,
        "replan · rebuild_route",
      ),
    ];
  }

  if (input.conflict?.kind === "day_overcrowded") {
    return [
      mk(
        0,
        `Day ${day} 동선 간소화`,
        `Day ${day} 이동 동선 다시 짜줘`,
        "replan · overcrowded rebuild",
      ),
    ];
  }

  const failed = input.failedStep;
  if (failed) {
    // P5 — scout miss → one broader lodging search then continue pending
    if (
      /호텔|숙소|scout|검색/iu.test(`${failed.labelKo} ${failed.utterance}`) &&
      /찾|검색|scout/iu.test(failed.utterance)
    ) {
      const pendingRest = input.plan.steps
        .filter((s) => s.status === "pending" || s.id !== failed.id)
        .filter((s) => s.status === "pending" || s.status === "skipped")
        .slice(0, 3)
        .map((s, i) => ({
          ...s,
          id: `ws_replan_${i + 2}`,
          status: "pending" as const,
          noteKo: `replan · after empty scout`,
          observation: null,
        }));
      return [
        mk(
          0,
          "호텔 재검색",
          "오사카 호텔 찾아줘",
          "replan · broaden lodging scout",
        ),
        ...pendingRest,
      ];
    }
    if (/빼|제거|remove/u.test(failed.labelKo + failed.utterance)) {
      return input.plan.steps
        .filter((s) => s.status === "pending" || s.status === "skipped")
        .slice(0, 2)
        .map((s, i) => ({
          ...s,
          id: `ws_replan_${i + 1}`,
          status: "pending" as const,
          noteKo: `replan · skip-fail ${failed.id}`,
          observation: null,
        }));
    }
    if (/맛집|eatery|저녁/u.test(failed.labelKo + failed.utterance)) {
      return [
        mk(
          0,
          `Day ${day} 동선 다시`,
          `Day ${day} 이동 동선 다시 짜줘`,
          "replan · skip eatery",
        ),
      ];
    }
    if (/day|데이|동선|일정/iu.test(input.plan.sourceUtterance)) {
      return [
        mk(
          0,
          `Day ${day} 동선 다시`,
          `Day ${day} 이동 동선 다시 짜줘`,
          "replan · soft finish",
        ),
      ];
    }
  }

  return null;
}

export function attachConflictReplan(input: {
  readonly plan: WorkspaceAgentPlan;
  readonly remainingDone: readonly WorkspaceAgentPlanStep[];
  readonly replanSteps: readonly WorkspaceAgentPlanStep[];
}): WorkspaceAgentPlan {
  return {
    version: WORKSPACE_AGENT_PLAN_VERSION,
    planId: `${input.plan.planId}_replan`,
    contextEventId: input.plan.contextEventId,
    sourceUtterance: input.plan.sourceUtterance,
    planKind: input.plan.planKind,
    steps: [...input.remainingDone, ...input.replanSteps],
    createdAtIso: new Date().toISOString(),
    cursor: input.remainingDone.length,
  };
}
