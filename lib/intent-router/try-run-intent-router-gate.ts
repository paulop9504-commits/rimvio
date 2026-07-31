/**
 * Intent Router gate — Soft propose · Draft Plan · Hard Workspace.
 * Runs at NL intent_parser; does not replace tool_router.
 */

import type { ContextNlActionResult } from "@/lib/action-planner/context-nl-types";
import type { ContextPackV1 } from "@/lib/context-builder";
import {
  isTripPrepUtterance,
  parseTripPrepSlots,
} from "@/lib/action-planner/build-trip-prep-plan";
import { ACTION_PLAN_VERSION } from "@/lib/action-planner/types";
import { openWorkspaceForTripPrep } from "@/lib/agent/open-workspace-for-trip-prep";
import {
  buildIntentPlan,
} from "@/lib/intent-router/build-intent-plan";
import { resolveIntentRoute } from "@/lib/intent-router/resolve-intent-route";
import {
  clearPendingCreateProject,
  isCreateProjectAffirmUtterance,
  isCreateProjectRejectUtterance,
  readPendingCreateProject,
  writePendingCreateProject,
} from "@/lib/intent-router/pending-create-project-store";
import { writeClarifyLessPending } from "@/lib/rule-engine/clarify-less-pending-store";
import type { RuleEngineDecision } from "@/lib/rule-engine/evaluate-utterance-rules";
import { copy } from "@/lib/copy/human-ko";

type ClarifyResult = Extract<ContextNlActionResult, { via: "clarify" }>;
type SoftResult = Extract<ContextNlActionResult, { via: "soft_command" }>;

function tripPrepOpenUtterance(input: {
  readonly utterance: string;
  readonly destinationKo: string | null;
  readonly stayLabelKo: string | null;
}): string {
  const u = input.utterance.trim();
  if (isTripPrepUtterance(u) || /준비해|여행\s*준비|일정\s*(?:짜|만들)/iu.test(u)) {
    return u;
  }
  const dest = input.destinationKo?.trim() || "여행";
  const stay = input.stayLabelKo?.trim() || "";
  return `${dest} ${stay} 여행 준비해줘`.replace(/\s+/gu, " ").trim();
}

function buildTripPrepPlanStub(input: {
  readonly contextEventId: string;
  readonly utterance: string;
}): import("@/lib/action-planner/types").ActionPlanV1 {
  const tripPrep = parseTripPrepSlots(input.utterance);
  return {
    version: ACTION_PLAN_VERSION,
    planId: `intent-create:${Date.now()}`,
    contextEventId: input.contextEventId,
    utterance: input.utterance,
    steps: [],
    createdAtIso: new Date().toISOString(),
    diffBundleId: `intent-diff:${Date.now()}`,
    planKind: "trip_prep",
    requiresFieldCommit: false,
    tripPrep,
  };
}

function openChips(draft: boolean) {
  return [
    {
      id: "intent_create_project_yes",
      labelKo: draft
        ? copy.globe.intentRouterReviewReadyChip
        : copy.globe.intentRouterCreateYesChip,
      gapId: "create_project",
      value: draft ? "확인했어요" : "만들어",
    },
    {
      id: "intent_create_project_explore",
      labelKo: copy.globe.intentRouterExploreChip,
      gapId: "explore",
      value: "그냥 볼래",
    },
    {
      id: "intent_create_project_later",
      labelKo: copy.globe.intentRouterLaterChip,
      gapId: "cancel",
      value: "나중에",
    },
  ] as const;
}

/**
 * Affirm / reject pending Soft or Draft CREATE.
 */
export function tryResolvePendingCreateProject(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly ruleDecision: RuleEngineDecision;
  readonly pack: ContextPackV1;
}): SoftResult | ClarifyResult | null {
  const contextEventId = input.contextEventId.trim();
  const pending = readPendingCreateProject(contextEventId);
  if (!pending) return null;

  if (isCreateProjectRejectUtterance(input.utterance)) {
    clearPendingCreateProject(contextEventId);
    return {
      ok: true,
      via: "soft_command",
      contextEventId,
      assistantReplyKo: copy.globe.intentRouterCreateRejected,
      reservedOpIds: [],
      waitingCommit: false,
      mapsUrl: null,
      softKind: "navigate",
      ruleDecision: input.ruleDecision,
      contextPack: input.pack,
    };
  }

  if (!isCreateProjectAffirmUtterance(input.utterance)) {
    return null;
  }

  // Draft already has Spatial Reality Draft open — affirm = review ack (not re-open).
  if (pending.stage === "draft") {
    clearPendingCreateProject(contextEventId);
    const title =
      pending.plan?.titleKo ||
      [pending.destinationKo, pending.stayLabelKo].filter(Boolean).join(" · ") ||
      "여행";
    return {
      ok: true,
      via: "soft_command",
      contextEventId,
      assistantReplyKo: copy.globe.intentRouterDraftReviewed(title),
      reservedOpIds: [],
      waitingCommit: false,
      mapsUrl: null,
      softKind: "navigate",
      ruleDecision: input.ruleDecision,
      contextPack: input.pack,
    };
  }

  clearPendingCreateProject(contextEventId);
  const utterance = pending.originalUtterance;
  const openUtterance = tripPrepOpenUtterance({
    utterance,
    destinationKo: pending.destinationKo,
    stayLabelKo: pending.stayLabelKo,
  });
  const opened = openWorkspaceForTripPrep({
    utterance: openUtterance,
    contextEventId,
    plan: buildTripPrepPlanStub({
      contextEventId,
      utterance: openUtterance,
    }),
    skipUserChat: false,
  });

  const title =
    pending.plan?.titleKo ||
    [pending.destinationKo, pending.stayLabelKo].filter(Boolean).join(" · ") ||
    "여행";

  return {
    ok: true,
    via: "soft_command",
    contextEventId,
    assistantReplyKo: opened
      ? copy.globe.intentRouterCreateOpened(title)
      : copy.globe.intentRouterCreateOpenFailed,
    reservedOpIds: [],
    waitingCommit: false,
    mapsUrl: null,
    softKind: "navigate",
    ruleDecision: input.ruleDecision,
    contextPack: input.pack,
  };
}

/**
 * Soft propose OR Draft Reality open for CREATE travel.
 * Draft = spatial Action-Ready graph on map (Prepared State) — not essay, not Commit.
 */
export function tryRunIntentRouterSoftCreateOffer(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly ruleDecision: RuleEngineDecision;
  readonly pack: ContextPackV1;
}): ClarifyResult | SoftResult | null {
  const utterance = input.utterance.trim();
  const contextEventId = input.contextEventId.trim();
  if (!utterance || !contextEventId) return null;

  const route = resolveIntentRoute({ utterance, contextEventId });
  const isDraft = route.surface === "draft_preview" && route.mode === "create";
  const isSoft = route.surface === "soft_propose" && route.mode === "create";
  if (!isDraft && !isSoft) {
    return null;
  }

  const plan = buildIntentPlan({ route, utterance });

  // DRAFT → place Reality Draft on Workspace map at real coordinates (READY).
  if (isDraft) {
    const openUtterance = tripPrepOpenUtterance({
      utterance,
      destinationKo: route.destinationKo,
      stayLabelKo: route.stayLabelKo,
    });
    const opened = openWorkspaceForTripPrep({
      utterance: openUtterance,
      contextEventId,
      plan: buildTripPrepPlanStub({
        contextEventId,
        utterance: openUtterance,
      }),
      skipUserChat: true,
    });
    if (!opened) {
      return null;
    }

    writePendingCreateProject({
      contextEventId,
      originalUtterance: utterance,
      destinationKo: route.destinationKo,
      stayLabelKo: route.stayLabelKo,
      atIso: new Date().toISOString(),
      stage: "draft",
      plan,
    });

    const readyCount = opened.nodes.filter(
      (n) => n.actionReadyState === "ready",
    ).length;
    const chips = openChips(true);
    writeClarifyLessPending(contextEventId, {
      originalUtterance: utterance,
      intentLabelKo: "Draft",
      candidateIds: chips.map((c) => c.value),
      atIso: new Date().toISOString(),
    });

    return {
      ok: true,
      via: "clarify",
      contextEventId,
      assistantReplyKo: copy.globe.intentRouterRealityDraftReady(
        plan.titleKo,
        readyCount || opened.nodes.length,
      ),
      reservedOpIds: [],
      waitingCommit: false,
      ruleDecision: input.ruleDecision,
      contextPack: input.pack,
      clarifyChips: chips,
    };
  }

  writePendingCreateProject({
    contextEventId,
    originalUtterance: utterance,
    destinationKo: route.destinationKo,
    stayLabelKo: route.stayLabelKo,
    atIso: new Date().toISOString(),
    stage: "soft",
    plan,
  });

  const title = plan.titleKo;
  const chips = openChips(false);

  writeClarifyLessPending(contextEventId, {
    originalUtterance: utterance,
    intentLabelKo: "Create",
    candidateIds: chips.map((c) => c.value),
    atIso: new Date().toISOString(),
  });

  return {
    ok: true,
    via: "clarify",
    contextEventId,
    assistantReplyKo: copy.globe.intentRouterCreatePropose(title),
    reservedOpIds: [],
    waitingCommit: false,
    ruleDecision: input.ruleDecision,
    contextPack: input.pack,
    clarifyChips: chips,
  };
}

/**
 * Hard CREATE travel — open Workspace immediately (no soft chip).
 */
export function tryRunIntentRouterHardCreateOpen(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly ruleDecision: RuleEngineDecision;
  readonly pack: ContextPackV1;
}): SoftResult | null {
  const utterance = input.utterance.trim();
  const contextEventId = input.contextEventId.trim();
  if (!utterance || !contextEventId) return null;

  const route = resolveIntentRoute({ utterance, contextEventId });
  if (
    route.mode !== "create" ||
    route.confidence !== "hard" ||
    route.domain !== "travel" ||
    route.surface !== "workspace"
  ) {
    return null;
  }

  if (isTripPrepUtterance(utterance)) {
    return null;
  }

  const openUtterance = tripPrepOpenUtterance({
    utterance,
    destinationKo: route.destinationKo,
    stayLabelKo: route.stayLabelKo,
  });

  const opened = openWorkspaceForTripPrep({
    utterance: openUtterance,
    contextEventId,
    plan: buildTripPrepPlanStub({
      contextEventId,
      utterance: openUtterance,
    }),
  });

  if (!opened) return null;

  const title =
    [route.destinationKo, route.stayLabelKo].filter(Boolean).join(" · ") ||
    "여행";

  return {
    ok: true,
    via: "soft_command",
    contextEventId,
    assistantReplyKo: copy.globe.intentRouterCreateOpened(title),
    reservedOpIds: [],
    waitingCommit: false,
    mapsUrl: null,
    softKind: "navigate",
    ruleDecision: input.ruleDecision,
    contextPack: input.pack,
  };
}
