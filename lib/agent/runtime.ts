/**
 * Workspace Agent Runtime — AI Cursor / AI Operator (STEP 7).
 *
 * Agent works inside Context (Active Workspace) only.
 *
 * Flow: Observe → Reason → Plan → Draft → Validate
 * Agent Commit 금지.
 */

import {
  executeAgentPlan,
  executeAgentCommit,
  type AgentExecuteResult,
} from "@/lib/agent/executor";
import {
  AGENT_RUNTIME_PHASES,
  isAgentCommitForbidden,
  planAgentOperator,
  reasonAgentOperator,
  type AgentRuntimeObservation,
  type AgentRuntimePhase,
  type AgentRuntimePlan,
  type AgentRuntimeReasoning,
} from "@/lib/agent/runtime-planner";
import type { RealityDraft } from "@/lib/draft";
import { readWorkspaceAgentContext } from "@/lib/workspace-agent/context-reader";
import {
  assertNoRealityCommitFromAgent,
  validateWorkspaceAgentImpact,
} from "@/lib/workspace-agent/validator";
import { readDraftMutation } from "@/lib/workspace-command/draft-mutation-store";
import type { WorkspaceActionProposal } from "@/lib/workspace-command/types";

export type AgentRuntimeValidation = {
  readonly ok: boolean;
  readonly reasonKo: string;
  readonly impactSummaryKo: string | null;
  readonly realityCommitBlocked: true;
};

export type AgentRuntimeOk = {
  readonly ok: true;
  readonly phase: "validate";
  readonly observation: AgentRuntimeObservation;
  readonly reasoning: AgentRuntimeReasoning;
  readonly plan: AgentRuntimePlan;
  readonly draft: RealityDraft;
  readonly alternativesKo: readonly string[];
  readonly validation: AgentRuntimeValidation;
  /** UX card for AI Operator */
  readonly uxKo: string;
  readonly summaryKo: string;
  readonly commitForbidden: true;
};

export type AgentRuntimeFail = {
  readonly ok: false;
  readonly phase: AgentRuntimePhase | "reject";
  readonly reasonKo: string;
  readonly inactiveWorkspace: boolean;
  readonly realityCommitAttempted: boolean;
};

export type AgentRuntimeResult = AgentRuntimeOk | AgentRuntimeFail;

export type AgentRuntimeInput = {
  readonly workspaceId: string;
  readonly utterance: string;
};

/**
 * Observe — Active Workspace Context only.
 */
export function observeAgentRuntime(
  workspaceId: string,
):
  | { readonly ok: true; readonly observation: AgentRuntimeObservation }
  | { readonly ok: false; readonly reasonKo: string; readonly inactiveWorkspace: true } {
  const observed = readWorkspaceAgentContext(workspaceId);
  if (!observed.ok) {
    return {
      ok: false,
      reasonKo: observed.reasonKo,
      inactiveWorkspace: true,
    };
  }
  const ctx = observed.context;
  const count = ctx.visibleHotelCount;
  const problemHintKo =
    ctx.notesKo.find((n) => /가격/u.test(n))?.replace(/^상태\s*·\s*/u, "") ??
    null;

  return {
    ok: true,
    observation: {
      workspaceId: ctx.workspaceId,
      contextId: ctx.contextId,
      hotelCandidateCount: count,
      currentLabelKo: `호텔 후보 ${count}개`,
      problemHintKo,
      currentHotelTitle: ctx.currentHotel?.title ?? null,
      draftOnly: true,
    },
  };
}

/**
 * UX card:
 *
 * AI Operator
 * 현재: 호텔 후보 12개
 * 문제: 가격 상승
 * 추천: 대체 호텔 발견
 */
export function formatAgentOperatorUxKo(input: {
  readonly observation: AgentRuntimeObservation;
  readonly reasoning: AgentRuntimeReasoning;
}): string {
  return [
    "AI Operator",
    "",
    "현재:",
    input.observation.currentLabelKo,
    "",
    "문제:",
    input.reasoning.problemKo,
    "",
    "추천:",
    input.reasoning.recommendationKo,
  ].join("\n");
}

function validateAgentDraft(input: {
  readonly draft: RealityDraft;
  readonly utterance: string;
}): AgentRuntimeValidation {
  assertNoRealityCommitFromAgent("validate");

  if (isAgentCommitForbidden(input.utterance)) {
    return {
      ok: false,
      reasonKo: "Reality Commit은 Agent가 할 수 없어요 · Field에서만 가능",
      impactSummaryKo: null,
      realityCommitBlocked: true,
    };
  }

  if (input.draft.status !== "proposed") {
    return {
      ok: false,
      reasonKo: "Draft가 proposed 상태가 아니에요",
      impactSummaryKo: null,
      realityCommitBlocked: true,
    };
  }

  // If mirrored workspace Draft exists, reuse workspace-agent validator
  if (input.draft.workspaceDraftId) {
    const wire = readDraftMutation(input.draft.workspaceDraftId);
    if (wire) {
      const proposal: WorkspaceActionProposal = {
        draft: wire,
        previewKo: input.draft.impact.summaryKo,
        applyLabelKo: "적용",
        cancelLabelKo: "취소",
      };
      const v = validateWorkspaceAgentImpact({
        proposal,
        utterance: input.utterance,
      });
      return {
        ok: v.ok,
        reasonKo: v.reasonKo,
        impactSummaryKo: v.impactSummaryKo,
        realityCommitBlocked: true,
      };
    }
  }

  return {
    ok: true,
    reasonKo: "Draft Impact 검증 통과 · Apply는 사용자만",
    impactSummaryKo: input.draft.impact.labelKo,
    realityCommitBlocked: true,
  };
}

/**
 * Run Agent Runtime: Observe → Reason → Plan → Draft → Validate.
 * Never Commits Reality.
 */
export function runAgentRuntime(input: AgentRuntimeInput): AgentRuntimeResult {
  const workspaceId = input.workspaceId.trim();
  const utterance = input.utterance.trim();

  if (!workspaceId || !utterance) {
    return {
      ok: false,
      phase: "reject",
      reasonKo: "Workspace / 발화가 없어요",
      inactiveWorkspace: !workspaceId,
      realityCommitAttempted: false,
    };
  }

  assertNoRealityCommitFromAgent("draft");

  if (isAgentCommitForbidden(utterance)) {
    return {
      ok: false,
      phase: "reject",
      reasonKo: "Agent Commit 금지 · Field에서 Reality Commit 하세요",
      inactiveWorkspace: false,
      realityCommitAttempted: true,
    };
  }

  // 1. Observe
  const observed = observeAgentRuntime(workspaceId);
  if (!observed.ok) {
    return {
      ok: false,
      phase: "observe",
      reasonKo: observed.reasonKo,
      inactiveWorkspace: true,
      realityCommitAttempted: false,
    };
  }
  const { observation } = observed;

  // 2. Reason
  const reasoning = reasonAgentOperator({ observation, utterance });

  // 3. Plan
  const plan = planAgentOperator({
    workspaceId,
    utterance,
    observation,
    reasoning,
  });
  if (!plan) {
    return {
      ok: false,
      phase: "plan",
      reasonKo: "Commit성 Plan은 Agent가 세울 수 없어요",
      inactiveWorkspace: false,
      realityCommitAttempted: true,
    };
  }

  // 4. Draft (executor)
  const executed: AgentExecuteResult = executeAgentPlan({
    workspaceId,
    utterance,
    plan,
    reasoning,
  });
  if (!executed.ok) {
    return {
      ok: false,
      phase: "draft",
      reasonKo: executed.reasonKo,
      inactiveWorkspace: false,
      realityCommitAttempted: executed.realityCommitAttempted,
    };
  }

  // 5. Validate
  const validation = validateAgentDraft({
    draft: executed.draft,
    utterance,
  });
  if (!validation.ok) {
    return {
      ok: false,
      phase: "validate",
      reasonKo: validation.reasonKo,
      inactiveWorkspace: false,
      realityCommitAttempted: true,
    };
  }

  const uxKo = formatAgentOperatorUxKo({ observation, reasoning });
  const summaryKo = [
    uxKo,
    "",
    plan.summaryKo,
    executed.alternativesKo.length
      ? `대체 · ${executed.alternativesKo.join(", ")}`
      : null,
    `Draft · ${executed.draft.id} · proposed`,
    "Validate · OK · Reality Commit 없음",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ok: true,
    phase: "validate",
    observation,
    reasoning,
    plan,
    draft: executed.draft,
    alternativesKo: executed.alternativesKo,
    validation,
    uxKo,
    summaryKo,
    commitForbidden: true,
  };
}

export {
  AGENT_RUNTIME_PHASES,
  executeAgentCommit,
  isAgentCommitForbidden,
  planAgentOperator,
  reasonAgentOperator,
};

export type {
  AgentRuntimeObservation,
  AgentRuntimePhase,
  AgentRuntimePlan,
  AgentRuntimeReasoning,
};
