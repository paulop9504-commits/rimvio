export type {
  TripExperienceState,
  TripExperienceGapId,
  TripFunAxis,
  TripDestinationScope,
} from "@/lib/globe/trip-experience/types";

export { isTripExperienceUtterance } from "@/lib/globe/trip-experience/detect-trip-experience-utterance";
export { inferTripFunAxisFromMessage } from "@/lib/globe/trip-experience/infer-trip-fun-axis-from-message";
export { readTripExperienceState } from "@/lib/globe/trip-experience/read-trip-experience-state";
export {
  assessTripExperienceGaps,
  hasCompleteTripExperience,
} from "@/lib/globe/trip-experience/assess-trip-experience-gaps";
export {
  buildTripExperienceAskChips,
  resolveTripExperienceChipValue,
  type TripExperienceAskChip,
} from "@/lib/globe/trip-experience/build-trip-experience-ask-chips";
export {
  planOneShotTripExperiencePrep,
  type OneShotTripExperiencePrepPlan,
  type OneShotTripExperiencePrepStep,
} from "@/lib/globe/trip-experience/plan-one-shot-trip-experience-prep";
export { writeTripExperiencePartial } from "@/lib/globe/trip-experience/write-trip-experience-partial";
export { applyTripExperienceAskChip } from "@/lib/globe/trip-experience/apply-trip-experience-ask-chip";
