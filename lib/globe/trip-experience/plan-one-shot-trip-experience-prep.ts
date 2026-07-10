import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  assessTripExperienceGaps,
  hasCompleteTripExperience,
} from "@/lib/globe/trip-experience/assess-trip-experience-gaps";
import { isTripExperienceUtterance } from "@/lib/globe/trip-experience/detect-trip-experience-utterance";
import { readTripExperienceState } from "@/lib/globe/trip-experience/read-trip-experience-state";
import type {
  TripExperienceGapId,
  TripExperienceState,
} from "@/lib/globe/trip-experience/types";

export type OneShotTripExperiencePrepStep =
  | "parse_affect"
  | "merge_experience_slots"
  | "scout_lodging"
  | "scout_eatery"
  | "scout_activity"
  | "select_main_legs";

export type OneShotTripExperiencePrepPlan = {
  readonly message: string;
  readonly experienceState: TripExperienceState;
  readonly experienceGaps: readonly TripExperienceGapId[];
  readonly readyForScout: boolean;
  readonly scoutLegs: readonly ("lodging" | "eatery" | "activity")[];
  readonly steps: readonly OneShotTripExperiencePrepStep[];
};

function scoutLegsForAxis(
  funAxis: TripExperienceState["funAxis"],
): readonly ("lodging" | "eatery" | "activity")[] {
  switch (funAxis) {
    case "food_market":
      return ["eatery", "lodging", "activity"];
    case "nature":
      return ["lodging", "activity", "eatery"];
    case "festival":
      return ["activity", "lodging", "eatery"];
    case "culture":
      return ["activity", "eatery", "lodging"];
    default:
      return ["lodging", "eatery", "activity"];
  }
}

/** Pure plan — fun trip utterance → experience slots → scout readiness. */
export function planOneShotTripExperiencePrep(input: {
  message: string;
  event: EventCandidate | null | undefined;
  userLat?: number | null;
  userLng?: number | null;
  now?: Date;
}): OneShotTripExperiencePrepPlan | null {
  const message = input.message.trim();
  if (!message || !isTripExperienceUtterance(message)) {
    return null;
  }

  const experienceState = readTripExperienceState({
    event: input.event,
    message,
    userLat: input.userLat,
    userLng: input.userLng,
    now: input.now,
  });
  const experienceGaps = assessTripExperienceGaps(experienceState);

  const readyForScout =
    experienceState.funAxis != null &&
    experienceState.destinationScope != null &&
    Boolean(experienceState.checkInIso && experienceState.checkOutIso);

  const steps: OneShotTripExperiencePrepStep[] = ["parse_affect", "merge_experience_slots"];
  const scoutLegs = scoutLegsForAxis(experienceState.funAxis);
  if (readyForScout) {
    steps.push("scout_lodging", "scout_eatery", "scout_activity", "select_main_legs");
  }

  return {
    message,
    experienceState,
    experienceGaps,
    readyForScout,
    scoutLegs,
    steps,
  };
}

export function isTripExperiencePlanComplete(plan: OneShotTripExperiencePrepPlan): boolean {
  return hasCompleteTripExperience(plan.experienceState);
}
