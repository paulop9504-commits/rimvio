import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";

export type MarketWizardStepId =
  | "role"
  | "recognize"
  | "priority"
  | "photos"
  | "memory"
  | "place"
  | "review";

const SEEKING_STEPS: readonly MarketWizardStepId[] = [
  "role",
  "recognize",
  "place",
  "review",
];

const LISTING_STEPS: readonly MarketWizardStepId[] = [
  "role",
  "recognize",
  "photos",
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
