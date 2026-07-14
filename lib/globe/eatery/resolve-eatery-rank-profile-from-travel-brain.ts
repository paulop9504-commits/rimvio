import type { EventCandidate } from "@/lib/events/event-candidate";
import { countDiscoveryFeedRejectSignals } from "@/lib/globe/intelligent-pin/record-discovery-feed-scroll-signal";
import type {
  EateryRankContextHints,
  EateryRankMode,
  EateryRankProfile,
} from "@/lib/globe/eatery/eatery-rank-profile";
import {
  DEFAULT_EATERY_RANK_PROFILE,
  resolveEateryRankProfile,
} from "@/lib/globe/eatery/eatery-rank-profile";
import { readEateryRankModeOverride } from "@/lib/globe/eatery/eatery-rank-mode-session-store";
import type {
  TravelBrainSlot,
  TravelBrainSlotId,
  TravelBrainState,
  TravelBudgetBand,
  TravelCompanionMode,
  TravelFoodBias,
  TravelMealTimingPattern,
} from "@/lib/situation-projection/travel-brain-personalization";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";

/** Apply food_bias to rank profile when slot confidence clears this bar. */
export const EATERY_RANK_TRAVEL_BRAIN_CONFIDENCE_MIN = 0.55 as const;

function slotApplies<T extends TravelBrainSlotId>(
  slot: TravelBrainSlot<T>,
): boolean {
  return (
    slot.confidence >= EATERY_RANK_TRAVEL_BRAIN_CONFIDENCE_MIN ||
    slot.source === "learned"
  );
}

/** TravelBrain slots → EateryRankContextHints (confidence-gated). */
export function resolveEateryRankContextHintsFromTravelBrain(
  travelBrain: TravelBrainState,
  extra?: {
    rejectSignalCount?: number;
  },
): EateryRankContextHints {
  const hints: EateryRankContextHints = {};

  if (slotApplies(travelBrain.slots.food_bias)) {
    hints.foodBias = travelBrain.slots.food_bias.value;
  }
  if (slotApplies(travelBrain.slots.meal_timing_pattern)) {
    hints.mealTiming = travelBrain.slots.meal_timing_pattern.value;
  }
  if (slotApplies(travelBrain.slots.budget_band)) {
    hints.budgetBand = travelBrain.slots.budget_band.value;
  }
  if (slotApplies(travelBrain.slots.companion_mode)) {
    hints.companionMode = travelBrain.slots.companion_mode.value;
  }
  if (extra?.rejectSignalCount != null && extra.rejectSignalCount > 0) {
    hints.rejectSignalCount = extra.rejectSignalCount;
  }

  return hints;
}

export function resolveEateryRankProfileFromTravelBrain(input: {
  travelBrain: TravelBrainState;
  mode?: EateryRankMode | null;
  contextEventId?: string | null;
  rejectSignalCount?: number;
}): EateryRankProfile {
  const rejectSignalCount =
    input.rejectSignalCount ??
    (input.contextEventId?.trim()
      ? countDiscoveryFeedRejectSignals(input.contextEventId.trim())
      : 0);

  const hints = resolveEateryRankContextHintsFromTravelBrain(input.travelBrain, {
    rejectSignalCount,
  });

  const profile = resolveEateryRankProfile({
    mode: input.mode ?? "auto",
    hints,
  });

  const foodSlot = input.travelBrain.slots.food_bias;
  if (
    profile.source === "context" &&
    slotApplies(foodSlot) &&
    foodSlot.reasonKo?.trim()
  ) {
    return {
      ...profile,
      reasonKo: foodSlot.reasonKo.trim(),
    };
  }

  return profile;
}

export function resolveEateryRankProfileForEvent(input: {
  event: EventCandidate;
  mode?: EateryRankMode | null;
  travelBrain?: TravelBrainState | null;
  contextEventId?: string | null;
}): EateryRankProfile {
  const contextEventId = input.contextEventId ?? input.event.id;
  const mode =
    input.mode ??
    readEateryRankModeOverride(contextEventId) ??
    "auto";
  const travelBrain = input.travelBrain ?? buildTravelBrainState(input.event);
  return resolveEateryRankProfileFromTravelBrain({
    travelBrain,
    mode,
    contextEventId,
  });
}

/** L2 trace — which travel-brain axes shaped the active profile. */
export function describeEateryRankTravelBrainAxes(
  travelBrain: TravelBrainState,
): {
  foodBias: TravelFoodBias | null;
  mealTiming: TravelMealTimingPattern | null;
  budgetBand: TravelBudgetBand | null;
  companionMode: TravelCompanionMode | null;
} {
  return {
    foodBias: slotApplies(travelBrain.slots.food_bias)
      ? travelBrain.slots.food_bias.value
      : null,
    mealTiming: slotApplies(travelBrain.slots.meal_timing_pattern)
      ? travelBrain.slots.meal_timing_pattern.value
      : null,
    budgetBand: slotApplies(travelBrain.slots.budget_band)
      ? travelBrain.slots.budget_band.value
      : null,
    companionMode: slotApplies(travelBrain.slots.companion_mode)
      ? travelBrain.slots.companion_mode.value
      : null,
  };
}

export function isDefaultEateryRankProfile(profile: EateryRankProfile): boolean {
  return (
    profile.mode === DEFAULT_EATERY_RANK_PROFILE.mode &&
    profile.source === DEFAULT_EATERY_RANK_PROFILE.source
  );
}
