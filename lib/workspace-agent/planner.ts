/**
 * Workspace Agent Planner — Understand Intent → Action Plan.
 * Scoped steps only; no Globe-wide ops; no Reality Commit.
 */

import { resolveWorkspaceIntent } from "@/lib/workspace-command/intent-resolver";
import { createWorkspaceCommand } from "@/lib/workspace-command/command-parser";
import type { WorkspaceIntent } from "@/lib/workspace-command/types";
import type {
  WorkspaceAgentContext,
  WorkspaceAgentPlan,
  WorkspaceAgentPlanStep,
} from "@/lib/workspace-agent/types";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function looksLikeHotelChange(text: string): boolean {
  return /호텔\s*바꿔|숙소\s*바꿔|다른\s*호텔|호텔\s*변경|바꿔\s*줘|change\s*hotel|replace\s*hotel/iu.test(
    text,
  );
}

/** Day1 fatigue / schedule soften — true Agent loop */
export function looksLikeScheduleFatigue(text: string): boolean {
  return (
    /첫\s*날|day\s*1|day1/iu.test(text) &&
    /피곤|빡세|힘들|과하|busy|fatigue|너무\s*많/iu.test(text)
  ) || /일정\s*너무|스케줄\s*빡|피곤할\s*것/iu.test(text);
}

function looksLikeForbiddenCommit(text: string): boolean {
  return /지구에\s*남|reality\s*commit|커밋|확정\s*결제|commit\s*globe/iu.test(
    text.trim(),
  );
}

/**
 * Map NL → Intent within Workspace (replace / modify_context / optimize…).
 */
export function understandWorkspaceAgentIntent(input: {
  readonly workspaceId: string;
  readonly utterance: string;
  readonly context: WorkspaceAgentContext;
}): WorkspaceIntent | null {
  if (looksLikeForbiddenCommit(input.utterance)) {
    return null;
  }

  if (looksLikeScheduleFatigue(input.utterance)) {
    return {
      action: "optimize_context",
      target: "schedule",
      parameters: {
        problem: "day1_fatigue",
        observe: ["airport", "hotel", "eatery", "sightseeing"],
        plan: ["remove_eatery_day1", "move_sightseeing_day2"],
        utterance: input.utterance,
        reasonKo: "첫날 피로도 높음 · 일정 완화",
      },
    };
  }

  const command = createWorkspaceCommand({
    workspaceId: input.workspaceId,
    rawText: input.utterance,
  });
  const resolved = resolveWorkspaceIntent(command, {
    targetObjectId: input.context.currentHotel?.objectId,
  });
  if (resolved) return resolved;

  if (looksLikeHotelChange(input.utterance)) {
    return {
      action: "replace",
      target: "hotel",
      parameters: {
        findSimilar: true,
        utterance: input.utterance,
        currentHotelId: input.context.currentHotel?.objectId ?? null,
        currentHotelTitle: input.context.currentHotel?.title ?? null,
        reasonKo: "호텔 변경 요청",
      },
    };
  }
  return null;
}

export function buildWorkspaceAgentPlan(input: {
  readonly intent: WorkspaceIntent;
  readonly context: WorkspaceAgentContext;
  readonly utterance: string;
}): WorkspaceAgentPlan {
  const fatigue =
    looksLikeScheduleFatigue(input.utterance) ||
    (input.intent.action === "optimize_context" &&
      input.intent.parameters.problem === "day1_fatigue");

  const hotelChange =
    !fatigue &&
    (input.intent.action === "replace" ||
      looksLikeHotelChange(input.utterance));

  const steps: WorkspaceAgentPlanStep[] = fatigue
    ? [
        {
          id: "s1",
          order: 1,
          labelKo: "Day1 일정 Observe",
          kind: "observe_schedule",
        },
        {
          id: "s2",
          order: 2,
          labelKo: "피로도 분석",
          kind: "analyze_fatigue",
        },
        {
          id: "s3",
          order: 3,
          labelKo: "대체 Plan",
          kind: "alternative_plan",
        },
        {
          id: "s4",
          order: 4,
          labelKo: "영향 Simulation",
          kind: "analyze_impact",
        },
        {
          id: "s5",
          order: 5,
          labelKo: "Draft 생성",
          kind: "create_draft",
        },
        {
          id: "s6",
          order: 6,
          labelKo: "적용 요청",
          kind: "request_apply",
        },
      ]
    : hotelChange
      ? [
          {
            id: "s1",
            order: 1,
            labelKo: "대체 호텔 탐색",
            kind: "explore_alternatives",
          },
          {
            id: "s2",
            order: 2,
            labelKo: "영향 분석",
            kind: "analyze_impact",
          },
          {
            id: "s3",
            order: 3,
            labelKo: "Draft 생성",
            kind: "create_draft",
          },
          {
            id: "s4",
            order: 4,
            labelKo: "적용 요청",
            kind: "request_apply",
          },
        ]
      : [
          {
            id: "s1",
            order: 1,
            labelKo: "Context 영향 분석",
            kind: "analyze_impact",
          },
          {
            id: "s2",
            order: 2,
            labelKo: "Draft 생성",
            kind: "create_draft",
          },
          {
            id: "s3",
            order: 3,
            labelKo: "적용 요청",
            kind: "request_apply",
          },
        ];

  const current = input.context.currentHotel?.title ?? "현재 숙소";
  const summaryKo = fatigue
    ? "Day1 피로도 높음 · 맛집 제거 · Day2 이동 · Draft 준비"
    : hotelChange
      ? `Hotel Change · ${current} 대체안 준비`
      : `Workspace Plan · ${input.intent.action}`;

  return {
    id: newId("wap"),
    summaryKo,
    steps,
    intent: input.intent,
  };
}

export function isWorkspaceAgentCommitForbidden(utterance: string): boolean {
  return looksLikeForbiddenCommit(utterance);
}
