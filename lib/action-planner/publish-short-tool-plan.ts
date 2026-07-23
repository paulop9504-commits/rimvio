/**
 * Phase D / M1 — publish short ToolId plan to Globe Action Plan card.
 * Does not run tools; pairs with existing Search / scout path.
 */

import {
  draftShortToolPlan,
  formatShortToolPlanPreviewKo,
} from "@/lib/action-planner/draft-short-tool-plan";
import { shouldDraftShortToolPlan } from "@/lib/action-planner/should-draft-short-tool-plan";
import { writeActionPlanUi } from "@/lib/action-planner/action-plan-ui-store";
import type { ActionPlanV1 } from "@/lib/action-planner/types";
import type { IntentFamily } from "@/lib/rule-engine/constitution";
import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";

export function publishShortToolPlanPreview(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly intent?: IntentFamily | null;
}): ActionPlanV1 | null {
  const utterance = input.utterance.trim();
  const contextEventId = input.contextEventId.trim();
  if (!utterance || !contextEventId) {
    return null;
  }
  if (!shouldDraftShortToolPlan(utterance)) {
    return null;
  }

  const intent = input.intent ?? classifyIntentFamily(utterance);
  const plan = draftShortToolPlan({
    utterance,
    contextEventId,
    intent,
  });
  if (!plan || plan.steps.length === 0) {
    return null;
  }

  writeActionPlanUi(plan, {
    waitingCommit: plan.requiresFieldCommit,
    requestFieldOpen: false,
  });
  return plan;
}

export function shortToolPlanAssistantHintKo(plan: ActionPlanV1): string {
  return formatShortToolPlanPreviewKo(plan);
}
