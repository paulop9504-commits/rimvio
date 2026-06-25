import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";

export type MarketWizardStepId =
  | "role"
  | "recognize"
  | "priority"
  | "photos"
  | "memory"
  | "place"
  | "review";

/** Seeking: 상품 → Priority(조건) → 위치 → 확인 */
const SEEKING_STEPS: readonly MarketWizardStepId[] = [
  "role",
  "recognize",
  "priority",
  "place",
  "review",
];

/** Listing: 사진 → AI 인식 → Dynamic Slot → 장소 → 확인 */
const LISTING_STEPS: readonly MarketWizardStepId[] = [
  "role",
  "photos",
  "recognize",
  "priority",
  "place",
  "review",
];

export function marketWizardSteps(
  role: MarketIntentRole,
  options?: { skipRole?: boolean },
): readonly MarketWizardStepId[] {
  const base = role === "seeking" ? SEEKING_STEPS : LISTING_STEPS;
  if (options?.skipRole) {
    return base.filter((step) => step !== "role");
  }
  return base;
}

export function marketWizardProgress(
  role: MarketIntentRole,
  step: MarketWizardStepId,
  options?: { skipRole?: boolean },
): { current: number; total: number } {
  const steps = marketWizardSteps(role, options);
  const index = steps.indexOf(step);
  return {
    current: index < 0 ? 1 : index + 1,
    total: steps.length,
  };
}

export function marketWizardDefaultStep(
  role: MarketIntentRole,
  options?: { skipRole?: boolean; startStep?: MarketWizardStepId },
): MarketWizardStepId {
  const steps = marketWizardSteps(role, options);
  if (options?.startStep && steps.includes(options.startStep)) {
    return options.startStep;
  }
  return steps[0] ?? "recognize";
}
