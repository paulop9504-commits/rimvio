/**
 * Apply Reality Patch to live Workspace — soft narrow + optional Scout query.
 * User feels "work edited"; engine patches plan then Scout → Rank → Map.
 */

import { applyWorkspaceTransition } from "@/lib/context-workspace/apply-workspace-transition";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { withWorkspaceRelationships } from "@/lib/context-workspace/sync-workspace-relationships";
import type { ContextWorkspaceFilter } from "@/lib/context-workspace/types";
import {
  describeWorkspaceRealityPatch,
  mergeWorkspaceRealityPlan,
  nodeMatchesStayTypeBlob,
  parseWorkspaceRealityPatch,
  stayTypeTag,
  type WorkspaceRealityPatch,
  type WorkspaceRealityPlan,
} from "@/lib/context-workspace/workspace-reality-patch";
import {
  getLodgingStayTypeEntry,
  resolveLodgingStaySearchKeyword,
} from "@/lib/globe/lodging/lodging-stay-types";
import { learnPreference } from "@/lib/reality-memory/cross-context-memory";

export type ApplyWorkspaceRealityPatchResult = {
  readonly handled: boolean;
  readonly replyKo: string | null;
  readonly needsRescout: boolean;
  readonly scoutQuery: string | null;
  readonly plan: WorkspaceRealityPlan | null;
  readonly visibleCount: number;
};

function enrichNodeTagsForPlan(
  title: string,
  summary: string,
  tags: readonly string[],
  plan: WorkspaceRealityPlan,
): string[] {
  const next = [...tags];
  if (plan.stayType && nodeMatchesStayTypeBlob(title, summary, plan.stayType)) {
    const tag = stayTypeTag(plan.stayType);
    if (!next.includes(tag)) next.push(tag);
  }
  if (
    plan.onsenRequired &&
    /온천|onsen|노천|温泉/iu.test(`${title} ${summary}`)
  ) {
    if (!next.includes("onsen")) next.push("onsen");
  }
  return next;
}

function filterFromPlan(plan: WorkspaceRealityPlan): ContextWorkspaceFilter {
  const tagIncludes: string[] = [];
  if (plan.stayType) tagIncludes.push(stayTypeTag(plan.stayType));
  if (plan.onsenRequired) tagIncludes.push("onsen");
  return {
    maxPriceBand: plan.maxPriceBand,
    minRating: plan.minRating,
    tagIncludes: tagIncludes.length ? tagIncludes : null,
    queryIncludes: null,
  };
}

function buildScoutQuery(input: {
  utterance: string;
  plan: WorkspaceRealityPlan;
  areaHint: string | null;
}): string {
  const stayKw = resolveLodgingStaySearchKeyword({
    stayType: input.plan.stayType,
    message: input.utterance,
    areaHint: input.areaHint,
  });
  const bits: string[] = [];
  if (stayKw) bits.push(stayKw);
  else if (input.plan.stayType) {
    bits.push(
      getLodgingStayTypeEntry(input.plan.stayType)?.searchKeywordKo ??
        "숙소",
    );
  }
  if (input.plan.stationNear) bits.push("역 근처");
  if (input.plan.onsenRequired) bits.push("온천");
  if (input.plan.maxPriceBand != null && input.plan.maxPriceBand <= 2) {
    bits.push("가성비");
  }
  if (bits.length === 0) {
    return input.utterance.trim() || "숙소";
  }
  return bits.join(" ");
}

/**
 * Soft-apply patch to current candidates; return whether Scout must refill.
 */
export function applyWorkspaceRealityPatch(input: {
  contextEventId: string;
  utterance: string;
  patch?: WorkspaceRealityPatch | null;
}): ApplyWorkspaceRealityPatchResult {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  const patch =
    input.patch ?? parseWorkspaceRealityPatch(utterance);
  if (!contextEventId || !patch) {
    return {
      handled: false,
      replyKo: null,
      needsRescout: false,
      scoutQuery: null,
      plan: null,
      visibleCount: 0,
    };
  }

  const state = readContextWorkspace(contextEventId);
  if (!state) {
    return {
      handled: false,
      replyKo: null,
      needsRescout: false,
      scoutQuery: null,
      plan: null,
      visibleCount: 0,
    };
  }

  const editLabel = describeWorkspaceRealityPatch(patch);
  const plan = mergeWorkspaceRealityPlan(
    state.realityPlan,
    patch,
    editLabel,
  );

  // Tag candidates that already match the new preference (soft inventory).
  const taggedNodes = state.nodes.map((node) => ({
    ...node,
    tags: enrichNodeTagsForPlan(
      node.title,
      node.summaryKo,
      node.tags,
      plan,
    ),
  }));

  writeContextWorkspace(
    withWorkspaceRelationships({
      ...state,
      nodes: taggedNodes,
      realityPlan: plan,
      lastChangeKo: editLabel,
      updatedAtIso: new Date().toISOString(),
    }),
  );

  const filter = filterFromPlan(plan);
  const sortBy =
    plan.maxPriceBand != null && plan.maxPriceBand <= 2
      ? ("price_asc" as const)
      : plan.minRating != null
        ? ("rating_desc" as const)
        : null;

  applyWorkspaceTransition({
    contextEventId,
    op: "filter",
    filter,
    sortBy,
    changeKo: editLabel,
  });

  // Preserve plan after filter transition (transition may not know realityPlan).
  const afterFilter = readContextWorkspace(contextEventId);
  if (afterFilter) {
    writeContextWorkspace({
      ...afterFilter,
      realityPlan: plan,
      lastChangeKo: editLabel,
    });
  }

  const visible =
    readContextWorkspace(contextEventId)?.nodes.filter((n) => n.visible)
      .length ?? 0;

  const stayChanged =
    patch.stayType != null &&
    patch.stayType !== (state.realityPlan?.stayType ?? null);
  const needsRescout =
    stayChanged ||
    patch.stationNear === true ||
    patch.onsenRequired === true ||
    visible < 2;

  const areaHint =
    state.summaryKo?.replace(/\s*여행.*$/u, "").trim() ||
    state.query ||
    null;
  const scoutQuery = buildScoutQuery({ utterance, plan, areaHint });

  if (plan.stayType) {
    try {
      learnPreference({
        domain: "lodging",
        key: "stayType",
        value: plan.stayType,
        sourceContextId: contextEventId,
      });
    } catch {
      /* memory optional */
    }
  }

  const stayLabel = plan.stayType
    ? getLodgingStayTypeEntry(plan.stayType)?.labelKo
    : null;
  const replyKo = stayLabel
    ? `숙소 선호를 ${stayLabel}(으)로 바꿨어요${
        needsRescout ? " · 후보를 다시 맞출게요" : ` · ${visible}곳`
      }`
    : `${editLabel}${needsRescout ? " · 후보를 다시 맞출게요" : ` · ${visible}곳`}`;

  return {
    handled: true,
    replyKo,
    needsRescout,
    scoutQuery,
    plan,
    visibleCount: visible,
  };
}

export { parseWorkspaceRealityPatch };
