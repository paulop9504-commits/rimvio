import type { ExplorationPolicyKnobs } from "@/lib/globe/discovery-policy/apply-exploration-mode";
import {
  isConcreteCuisineEateryFocus,
  isSpecialtyDessertEateryFocus,
} from "@/lib/globe/context-condition-ai/parse-cuisine-candidates";
import { parseFoodBrandFocus } from "@/lib/globe/context-condition-ai/parse-food-brand-focus";

/**
 * When Intent is locked (초밥 · 브랜드 · 말차…) — loosen present/feed caps.
 * Exploration mode stays (rating vs novelty); only surface budget expands.
 */
export function isScoutIntentConverged(input: {
  message?: string | null;
  eateryFocus?: string | null;
  activityFocus?: string | null;
}): boolean {
  const message = input.message?.trim() ?? "";
  const eateryFocus = input.eateryFocus?.trim() ?? "";
  const activityFocus = input.activityFocus?.trim() ?? "";
  if (
    isConcreteCuisineEateryFocus(eateryFocus) ||
    isConcreteCuisineEateryFocus(message)
  ) {
    return true;
  }
  if (
    isSpecialtyDessertEateryFocus(eateryFocus) ||
    isSpecialtyDessertEateryFocus(message)
  ) {
    return true;
  }
  if (parseFoodBrandFocus(eateryFocus) || parseFoodBrandFocus(message)) {
    return true;
  }
  if (activityFocus.length >= 2) {
    return true;
  }
  return false;
}

export function applyConvergedIntentCapBoost(
  knobs: ExplorationPolicyKnobs,
  input: {
    message?: string | null;
    eateryFocus?: string | null;
    activityFocus?: string | null;
  },
): ExplorationPolicyKnobs {
  if (!isScoutIntentConverged(input)) {
    return knobs;
  }
  return {
    ...knobs,
    pinCap: Math.max(knobs.pinCap, 6),
    recommendCap: Math.max(knobs.recommendCap, 14),
    feedInventoryCap: Math.max(knobs.feedInventoryCap, 40),
    eateryMaxResults: Math.max(knobs.eateryMaxResults, 28),
    eateryPresentCap: Math.max(knobs.eateryPresentCap, 14),
    activityPresentCap: Math.max(knobs.activityPresentCap, 8),
    activityLandmarkPinCap: Math.max(knobs.activityLandmarkPinCap, 2),
  };
}
