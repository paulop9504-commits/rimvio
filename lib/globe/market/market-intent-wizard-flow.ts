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
  "priority",
  "memory",
  "place",
  "review",
];

const LISTING_STEPS: readonly MarketWizardStepId[] = [
  "role",
  "recognize",
  "priority",
  "photos",
  "memory",
  "place",
  "review",
];

export function marketWizardSteps(role: MarketIntentRole): readonly MarketWizardStepId[] {
  return role === "seeking" ? SEEKING_STEPS : LISTING_STEPS;
}

export function marketWizardProgress(
  role: MarketIntentRole,
  step: MarketWizardStepId,
): { current: number; total: number } {
  const steps = marketWizardSteps(role);
  const index = steps.indexOf(step);
  return {
    current: index < 0 ? 1 : index + 1,
    total: steps.length,
  };
}
