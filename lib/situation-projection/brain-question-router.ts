import type { EventCandidate } from "@/lib/events/event-candidate";
import { BRAIN_SECTOR_POLICIES } from "@/lib/situation-projection/brain-sector-registry";
import { type BrainQuestionFamily } from "@/lib/situation-projection/brain-question-memory";
import { classifySituationTypeFromEvent } from "@/lib/situation-projection/classify-situation-type";
import type { SituationType } from "@/lib/situation-projection/types";

type BrainRoutePolicy =
  (typeof BRAIN_SECTOR_POLICIES)[keyof typeof BRAIN_SECTOR_POLICIES] | null;

export type BrainQuestionRoute = {
  situationType: SituationType;
  family: BrainQuestionFamily | null;
  policy: BrainRoutePolicy;
  supportsQuestions: boolean;
  routeReason: "travel_family" | "care_family" | "business_family" | "generic_projection";
};

function resolveBrainQuestionFamily(
  situationType: SituationType,
): BrainQuestionFamily | null {
  switch (situationType) {
    case "travel":
      return "travel";
    case "caregiving":
      return "caregiving";
    default:
      return null;
  }
}

function resolveBrainQuestionPolicy(
  situationType: SituationType,
): BrainRoutePolicy {
  switch (situationType) {
    case "travel":
      return BRAIN_SECTOR_POLICIES.travel;
    case "caregiving":
      return BRAIN_SECTOR_POLICIES.caregiving;
    default:
      return null;
  }
}

export function resolveBrainQuestionRoute(
  event: EventCandidate,
): BrainQuestionRoute {
  const situationType = classifySituationTypeFromEvent(event);
  const family = resolveBrainQuestionFamily(situationType);
  const policy = resolveBrainQuestionPolicy(situationType);
  return {
    situationType,
    family,
    policy,
    supportsQuestions: family === "travel",
    routeReason:
      family === "travel"
        ? "travel_family"
        : family === "caregiving"
          ? "care_family"
          : family === "business"
            ? "business_family"
            : "generic_projection",
  };
}
