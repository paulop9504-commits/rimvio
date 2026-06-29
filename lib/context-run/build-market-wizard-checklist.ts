import { copy } from "@/lib/copy/human-ko";
import type { ExecutionFeedChecklistItem } from "@/lib/context-run/execution-feed-types";
import {
  marketWizardSteps,
  type MarketWizardStepId,
} from "@/lib/globe/market/market-intent-wizard-flow";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";

function stepLabel(step: MarketWizardStepId): string {
  switch (step) {
    case "role":
      return copy.globe.marketWizardStepRole;
    case "recognize":
      return copy.globe.marketWizardStepRecognize;
    case "priority":
      return copy.globe.marketWizardStepPriority;
    case "photos":
      return copy.globe.marketWizardStepPhotos;
    case "memory":
      return copy.globe.marketWizardStepMemory;
    case "description":
      return copy.globe.marketWizardStepDescription;
    case "place":
      return copy.globe.marketWizardStepPlace;
    case "review":
      return copy.globe.marketWizardStepReview;
    default: {
      const _exhaustive: never = step;
      return _exhaustive;
    }
  }
}

function stepBody(step: MarketWizardStepId, role: MarketIntentRole): string | null {
  switch (step) {
    case "photos":
      return copy.globe.marketWizardPhotosBody;
    case "recognize":
      return role === "listing"
        ? copy.globe.marketWizardRecognizeBody
        : copy.globe.marketWizardRecognizeBody;
    case "priority":
      return role === "listing"
        ? copy.globe.marketWizardPriorityTitleListing
        : copy.globe.marketWizardPriorityTitleSeeking;
    case "place":
      return role === "listing"
        ? copy.globe.marketWizardPlaceTitleListing
        : copy.globe.marketWizardPlaceTitleSeeking;
    case "review":
      return copy.globe.marketWizardReviewTitle;
    default:
      return null;
  }
}

/** Claude-style wizard checklist for @중고 Execution Feed artifact. */
export function buildMarketWizardChecklist(input: {
  role: MarketIntentRole;
  skipRole?: boolean;
  activeStep?: MarketWizardStepId | null;
  completedThroughStep?: MarketWizardStepId | null;
}): ExecutionFeedChecklistItem[] {
  const steps = marketWizardSteps(input.role, { skipRole: input.skipRole });
  const completedIndex =
    input.completedThroughStep != null
      ? steps.indexOf(input.completedThroughStep)
      : -1;
  const activeIndex =
    input.activeStep != null ? steps.indexOf(input.activeStep) : completedIndex + 1;

  return steps.map((step, index) => {
    const done = index <= completedIndex;
    const active = !done && index === activeIndex;
    return {
      id: step,
      titleKo: stepLabel(step),
      bodyKo: active ? stepBody(step, input.role) : null,
      done,
      priorityKo: active ? copy.globe.executionFeed.checklistActive : null,
      priorityTone: active ? "medium" as const : done ? "low" as const : undefined,
    };
  });
}

export function marketWizardDefaultActiveStep(
  role: MarketIntentRole,
  options?: { skipRole?: boolean },
): MarketWizardStepId {
  const steps = marketWizardSteps(role, options);
  return steps[options?.skipRole ? 0 : 1] ?? steps[0] ?? "recognize";
}
