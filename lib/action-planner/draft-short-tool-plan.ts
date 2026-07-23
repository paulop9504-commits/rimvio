/**
 * STEP6 — Intent → short Execution Plan (3–5 ToolId steps).
 * Rules-first; LLM may fill gaps later (not free-form every turn).
 */

import {
  ACTION_PLAN_VERSION,
  type ActionPlanStepV1,
  type ActionPlanV1,
} from "@/lib/action-planner/types";
import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";
import type { IntentFamily } from "@/lib/rule-engine/constitution";
import {
  resolveLookupToolId,
  resolvePlannerLookupDomain,
  resolveToolIdForIntent,
} from "@/lib/rule-engine/resolve-tool-id";
import type { RimvioToolId } from "@/lib/tool-registry";
import { getRimvioTool } from "@/lib/tool-registry";
import { isBrowseExtractQuery } from "@/lib/tool-registry/browse-extract";

const MAX_STEPS = 5;

function toolLabel(toolId: RimvioToolId): string {
  return getRimvioTool(toolId)?.labelKo ?? toolId;
}

function step(
  id: string,
  toolId: RimvioToolId,
  diffPhase: ActionPlanStepV1["diffPhase"] = "working_set",
): ActionPlanStepV1 {
  return {
    id,
    kind: "tool",
    labelKo: toolLabel(toolId),
    status: "pending",
    toolId,
    diffPhase,
  };
}

function waitCommitStep(id: string): ActionPlanStepV1 {
  return {
    id,
    kind: "wait_commit",
    labelKo: "승인 대기",
    status: "pending",
    diffPhase: "field_gate",
  };
}

/** Build a short ToolId plan from Intent (Search/Reserve/Analyze…). */
export function draftShortToolPlan(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly intent?: IntentFamily | null;
}): ActionPlanV1 | null {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  if (!contextEventId || !utterance) {
    return null;
  }

  const intent =
    input.intent ??
    classifyIntentFamily(utterance) ??
    ("Search" as IntentFamily);

  const domain = resolvePlannerLookupDomain(utterance);
  const lookupId =
    resolveToolIdForIntent({ intent: "Search", domain, query: utterance }) ??
    resolveLookupToolId(
      domain === "amenity" ? "poi" : domain,
      utterance,
    );

  const toolIds: RimvioToolId[] = [];
  const push = (id: RimvioToolId | null | undefined) => {
    if (!id || toolIds.includes(id) || toolIds.length >= MAX_STEPS - 1) {
      return;
    }
    toolIds.push(id);
  };

  if (intent === "Search" || intent === "Revise") {
    push(lookupId);
    if (lookupId !== "browse.extract" && isBrowseExtractQuery(utterance)) {
      push("browse.extract");
    }
    push(resolveToolIdForIntent({ intent: "Analyze", query: utterance }));
    if (/예약|reserve|book|예매|구매/iu.test(utterance)) {
      push(resolveToolIdForIntent({ intent: "Reserve", query: utterance }));
    }
  } else if (intent === "Analyze" || intent === "Predict") {
    push(lookupId);
    push(resolveToolIdForIntent({ intent: "Analyze", query: utterance }));
  } else if (intent === "Reserve" || intent === "Purchase") {
    push(lookupId);
    push(resolveToolIdForIntent({ intent: "Analyze", query: utterance }));
    push(resolveToolIdForIntent({ intent: "Reserve", query: utterance }));
  } else if (intent === "Compare") {
    push(lookupId);
    push(resolveToolIdForIntent({ intent: "Analyze", query: utterance }));
  } else {
    push(lookupId);
  }

  if (toolIds.length === 0) {
    return null;
  }

  const steps: ActionPlanStepV1[] = toolIds.map((toolId, index) =>
    step(`short-${index + 1}`, toolId, toolId === "booking.prepare" ? "field_gate" : "working_set"),
  );

  const needsField = toolIds.includes("booking.prepare");
  if (needsField && steps.length < MAX_STEPS) {
    steps.push(waitCommitStep(`short-${steps.length + 1}`));
  }

  const now = new Date().toISOString();
  return {
    version: ACTION_PLAN_VERSION,
    planId: `short-${contextEventId.slice(0, 8)}-${Date.now().toString(36)}`,
    contextEventId,
    utterance,
    steps: steps.slice(0, MAX_STEPS),
    createdAtIso: now,
    diffBundleId: `short-bundle-${contextEventId.slice(0, 8)}`,
    planKind: "short_tool",
    requiresFieldCommit: needsField,
  };
}

export function formatShortToolPlanPreviewKo(plan: ActionPlanV1): string {
  const labels = plan.steps.map((s) => s.labelKo).join(" → ");
  return `실행 계획 · ${labels}`;
}
