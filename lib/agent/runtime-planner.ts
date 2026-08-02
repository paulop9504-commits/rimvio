/**
 * Workspace Agent Runtime — Operator Planner (STEP 7).
 *
 * Reason → Plan (Context-scoped). Reality Commit never planned.
 *
 * Note: ActionPlan V1 planner remains in `planner.ts` (re-exports this module).
 */

import type { WorkspaceIntent } from "@/lib/workspace-command/types";
import { resolveWorkspaceIntent } from "@/lib/workspace-command/intent-resolver";
import { createWorkspaceCommand } from "@/lib/workspace-command/command-parser";

export const AGENT_RUNTIME_PHASES = [
  "observe",
  "reason",
  "plan",
  "draft",
  "validate",
] as const;

export type AgentRuntimePhase = (typeof AGENT_RUNTIME_PHASES)[number];

export type AgentRuntimeObservation = {
  readonly workspaceId: string;
  readonly contextId: string;
  readonly hotelCandidateCount: number;
  /** "호텔 후보 12개" */
  readonly currentLabelKo: string;
  readonly problemHintKo: string | null;
  readonly currentHotelTitle: string | null;
  readonly draftOnly: true;
};

export type AgentRuntimeReasoning = {
  /** "가격 상승" */
  readonly problemKo: string;
  /** "대체 호텔 발견" */
  readonly recommendationKo: string;
  readonly reasonKo: string;
  readonly confidence: number;
};

export type AgentRuntimePlanStep = {
  readonly id: string;
  readonly order: number;
  readonly phase: AgentRuntimePhase;
  readonly labelKo: string;
};

export type AgentRuntimePlan = {
  readonly id: string;
  readonly summaryKo: string;
  readonly steps: readonly AgentRuntimePlanStep[];
  readonly intent: WorkspaceIntent;
  readonly commitForbidden: true;
};

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function isAgentCommitForbidden(text: string): boolean {
  return /지구에\s*남|reality\s*commit|커밋|확정\s*결제|commit\s*globe|stamp\s*globe/iu.test(
    text.trim(),
  );
}

export function looksLikePriceRise(text: string): boolean {
  return /가격\s*상승|비싸|올랐|가격\s*올|price\s*up|가격\s*문제/iu.test(text);
}

export function looksLikeHotelReplace(text: string): boolean {
  return /호텔\s*바꿔|숙소\s*바꿔|다른\s*호텔|대체\s*호텔|바꿔\s*줘|change\s*hotel|replace/iu.test(
    text,
  );
}

/**
 * Reason — diagnose Context problem + recommendation (no mutation).
 */
export function reasonAgentOperator(input: {
  readonly observation: AgentRuntimeObservation;
  readonly utterance: string;
}): AgentRuntimeReasoning {
  const price =
    looksLikePriceRise(input.utterance) ||
    Boolean(input.observation.problemHintKo?.includes("가격"));

  const problemKo = price
    ? "가격 상승"
    : input.observation.hotelCandidateCount > 20
      ? "후보 과다"
      : "조건 재조정 필요";

  const recommendationKo =
    price || looksLikeHotelReplace(input.utterance)
      ? "대체 호텔 발견"
      : input.observation.hotelCandidateCount > 12
        ? "필터 Draft 제안"
        : "Workspace 최적화 제안";

  return {
    problemKo,
    recommendationKo,
    reasonKo: `${problemKo} → ${recommendationKo}`,
    confidence: price ? 0.9 : 0.7,
  };
}

/**
 * Plan — Intent + ordered phases. Never includes Commit.
 */
export function planAgentOperator(input: {
  readonly workspaceId: string;
  readonly utterance: string;
  readonly observation: AgentRuntimeObservation;
  readonly reasoning: AgentRuntimeReasoning;
}): AgentRuntimePlan | null {
  if (isAgentCommitForbidden(input.utterance)) {
    return null;
  }

  const command = createWorkspaceCommand({
    workspaceId: input.workspaceId,
    rawText: input.utterance,
  });
  let intent =
    resolveWorkspaceIntent(command, {
      targetObjectId: undefined,
    }) ?? null;

  if (!intent) {
    if (
      input.reasoning.recommendationKo === "대체 호텔 발견" ||
      looksLikeHotelReplace(input.utterance)
    ) {
      intent = {
        action: "replace",
        target: "hotel",
        parameters: {
          findSimilar: true,
          reasonKo: input.reasoning.reasonKo,
          problemKo: input.reasoning.problemKo,
          utterance: input.utterance,
          currentHotelTitle: input.observation.currentHotelTitle,
        },
      };
    } else {
      intent = {
        action: "modify_context",
        target: "hotel",
        parameters: {
          reasonKo: input.reasoning.reasonKo,
          utterance: input.utterance,
        },
      };
    }
  }

  const steps: AgentRuntimePlanStep[] = [
    { id: "s1", order: 1, phase: "observe", labelKo: "Context Observe" },
    { id: "s2", order: 2, phase: "reason", labelKo: "문제 진단" },
    { id: "s3", order: 3, phase: "plan", labelKo: "Action Plan" },
    { id: "s4", order: 4, phase: "draft", labelKo: "Draft 생성" },
    { id: "s5", order: 5, phase: "validate", labelKo: "Impact 검증" },
  ];

  return {
    id: newId("agent_plan"),
    summaryKo: `AI Operator · ${input.reasoning.recommendationKo}`,
    steps,
    intent,
    commitForbidden: true,
  };
}
