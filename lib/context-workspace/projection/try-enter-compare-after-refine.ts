/**
 * P2 — Soft refine Top-N → Compare Decision projection.
 * 「이중에 가성비 3개만」after in-set filter should enter One Focus compare UI,
 * without requiring the user to say 「비교」.
 */

import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import {
  runCompareDecisionPipeline,
  type CompareDecisionPipelineResult,
} from "@/lib/context-workspace/projection/run-compare-decision-pipeline";
import { workspaceDomainToCompareTarget } from "@/lib/context-workspace/projection/compare-intent";

function wantsTopNCompare(utterance: string, keepTopN: number | null): boolean {
  if (keepTopN == null || keepTopN < 2 || keepTopN > 5) return false;
  return /이\s*중|그중|그\s*중|가성비|상위|비교|개만|곳만|남겨|랭킹|top/iu.test(
    utterance,
  );
}

/**
 * Enter Compare Decision with visible (post-filter) top nodes as candidates.
 * Dims are already handled by filter_entity keepTopN — we compare the survivors.
 */
export function tryEnterCompareDecisionAfterRefine(input: {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly keepTopN?: number | null;
}): {
  readonly entered: boolean;
  readonly result: CompareDecisionPipelineResult | null;
  readonly replyKo: string | null;
} {
  const state = readContextWorkspace(input.contextEventId);
  if (!state || state.status === "closed" || state.status === "committed") {
    return { entered: false, result: null, replyKo: null };
  }

  const keepTopN =
    input.keepTopN ??
    state.constraintMemory?.keepTopN ??
    null;
  if (!wantsTopNCompare(input.utterance, keepTopN)) {
    return { entered: false, result: null, replyKo: null };
  }

  const visible = state.nodes.filter(
    (n) =>
      n.visible &&
      n.source !== "reality_anchor" &&
      !n.tags.includes("reality_anchor") &&
      (n.kind === "lodging" ||
        n.kind === "eatery" ||
        n.kind === "poi" ||
        n.kind === "amenity"),
  );
  if (visible.length < 2) {
    return { entered: false, result: null, replyKo: null };
  }

  const n = Math.min(keepTopN ?? 3, 5, visible.length);
  const explicitNodeIds = visible.slice(0, n).map((node) => node.id);
  if (explicitNodeIds.length < 2) {
    return { entered: false, result: null, replyKo: null };
  }

  const target = workspaceDomainToCompareTarget(state.domain);
  const result = runCompareDecisionPipeline({
    utterance: input.utterance,
    contextEventId: input.contextEventId,
    explicitNodeIds,
    intent: {
      intent: "compare",
      target,
      contextId: input.contextEventId,
      criteriaFromContext: true,
    },
  });

  return {
    entered: result.ok,
    result,
    replyKo: result.ok
      ? result.replyKo ?? `가성비 TOP ${explicitNodeIds.length} · 비교`
      : null,
  };
}
