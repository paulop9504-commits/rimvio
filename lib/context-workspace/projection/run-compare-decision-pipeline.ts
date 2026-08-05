/**
 * Intent → Compare Decision Pipeline
 *
 * Intent Parser → Compare Intent → Context Weight → Candidates
 *   → Decision Projection → Map Projection (enter compare_decision)
 *
 * Domain-agnostic: hotel / restaurant / hospital / … all use compare_decision.
 */

import { applyWorkspaceTransition } from "@/lib/context-workspace/apply-workspace-transition";
import {
  readContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import type {
  ContextWorkspaceDomain,
  ContextWorkspaceNode,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import {
  buildDecisionProjectionsForCompare,
  resolveCompareCriteriaWeights,
} from "@/lib/context-workspace/projection/build-decision-projection";
import { enterCompareDecisionProjection } from "@/lib/context-workspace/projection/compare-decision-state";
import type {
  CompareDecisionCriteriaWeights,
  CompareDecisionState,
  DecisionProjection,
} from "@/lib/context-workspace/projection/types";
import {
  compareTargetToWorkspaceDomain,
  parseCompareIntent,
  type CompareIntent,
  type CompareIntentTarget,
} from "@/lib/context-workspace/projection/compare-intent";

export type CompareDecisionPipelineResult = {
  readonly ok: boolean;
  readonly intent: CompareIntent | null;
  readonly weights: CompareDecisionCriteriaWeights | null;
  readonly candidateEntityIds: readonly string[];
  readonly decisions: readonly DecisionProjection[];
  readonly projection: CompareDecisionState | null;
  readonly replyKo: string | null;
};

function nodesForTarget(
  state: ContextWorkspaceState,
  target: CompareIntentTarget,
): ContextWorkspaceNode[] {
  const domain = compareTargetToWorkspaceDomain(target);
  const visible = state.nodes.filter((n) => n.visible);
  if (!domain) return visible;
  const matched = visible.filter((n) => n.kind === domain);
  return matched.length > 0 ? matched : visible;
}

/**
 * Resolve compare candidates — selected first, else domain-visible nodes.
 * Never hotel-hardcoded id lists.
 */
export function resolveCompareCandidateEntityIds(input: {
  readonly state: ContextWorkspaceState;
  readonly target: CompareIntentTarget;
  readonly explicitNodeIds?: readonly string[] | null;
}): readonly string[] {
  const { state, target } = input;
  if (input.explicitNodeIds && input.explicitNodeIds.length >= 2) {
    return [...input.explicitNodeIds].slice(0, 5);
  }

  const pool = nodesForTarget(state, target);
  const poolIds = new Set(pool.map((n) => n.id));

  const selectedInPool = state.selectedIds.filter((id) => poolIds.has(id));
  if (selectedInPool.length >= 2) {
    return selectedInPool.slice(0, 5);
  }

  const bookmarked = pool.filter((n) => n.bookmarked).map((n) => n.id);
  if (bookmarked.length >= 2) {
    return bookmarked.slice(0, 5);
  }

  if (state.compareIds.length >= 2) {
    const existing = state.compareIds.filter((id) =>
      state.nodes.some((n) => n.id === id),
    );
    if (existing.length >= 2) return existing.slice(0, 5);
  }

  return pool.slice(0, 5).map((n) => n.id);
}

function targetLabelKo(target: CompareIntentTarget): string {
  switch (target) {
    case "hotel":
    case "lodging":
      return "숙소";
    case "restaurant":
    case "eatery":
      return "맛집";
    case "hospital":
    case "amenity":
      return "편의";
    case "realestate":
      return "매물";
    case "company":
      return "회사";
    default:
      return "후보";
  }
}

/**
 * Full pipeline: NL → Compare Intent → weights → candidates → Decision → Map projection.
 */
export function runCompareDecisionPipeline(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly explicitNodeIds?: readonly string[] | null;
  readonly intent?: CompareIntent | null;
}): CompareDecisionPipelineResult {
  const contextEventId = input.contextEventId.trim();
  const fail = (
    partial: Partial<CompareDecisionPipelineResult> = {},
  ): CompareDecisionPipelineResult => ({
    ok: false,
    intent: null,
    weights: null,
    candidateEntityIds: [],
    decisions: [],
    projection: null,
    replyKo: null,
    ...partial,
  });

  if (!contextEventId) return fail();

  const state = readContextWorkspace(contextEventId);
  if (!state || state.status === "closed" || state.status === "committed") {
    return fail({ replyKo: "열린 Workspace가 없어요" });
  }

  const intent =
    input.intent ??
    parseCompareIntent({
      utterance: input.utterance,
      contextId: contextEventId,
      sessionDomain: state.domain,
    });
  if (!intent) {
    return fail();
  }

  const weights = intent.criteriaFromContext
    ? resolveCompareCriteriaWeights(state)
    : resolveCompareCriteriaWeights(state);

  const candidateEntityIds = resolveCompareCandidateEntityIds({
    state,
    target: intent.target,
    explicitNodeIds: input.explicitNodeIds,
  });

  if (candidateEntityIds.length < 2) {
    return fail({
      intent,
      weights,
      candidateEntityIds,
      replyKo: `${targetLabelKo(intent.target)} 후보가 2곳 이상 필요해요`,
    });
  }

  const next = applyWorkspaceTransition({
    contextEventId,
    op: "compare",
    nodeIds: [...candidateEntityIds],
  });
  if (!next) {
    return fail({
      intent,
      weights,
      candidateEntityIds,
      replyKo: "비교를 적용하지 못했어요",
    });
  }

  writeContextWorkspaceExpanded(contextEventId, true);
  dispatchContextWorkspaceExpand({
    contextEventId,
    source: "nl_open",
  });

  const projection = enterCompareDecisionProjection({
    contextEventId,
    workspace: next,
    criteriaWeights: weights,
  });

  const decisions = buildDecisionProjectionsForCompare(next, weights);

  return {
    ok: Boolean(projection) && decisions.length >= 2,
    intent,
    weights,
    candidateEntityIds,
    decisions,
    projection,
    replyKo: `${targetLabelKo(intent.target)} ${decisions.length}곳 Context 판단`,
  };
}

export type { CompareIntent, CompareIntentTarget, ContextWorkspaceDomain };
