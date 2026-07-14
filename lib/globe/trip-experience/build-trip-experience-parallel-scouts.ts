import type { LocalDiscoveryActionSpec } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { OneShotTripExperiencePrepPlan } from "@/lib/globe/trip-experience/plan-one-shot-trip-experience-prep";
import type {
  TripDestinationScope,
  TripFunAxis,
} from "@/lib/globe/trip-experience/types";

export type TripExperienceScoutLeg = "lodging" | "eatery" | "activity";

export type TripExperienceParallelScout = {
  readonly leg: TripExperienceScoutLeg;
  readonly spec: LocalDiscoveryActionSpec;
  readonly labelKo: string;
};

function mapBudget(
  band: OneShotTripExperiencePrepPlan["experienceState"]["budgetBand"],
): LocalDiscoveryActionSpec["budget"] {
  if (band === "value") {
    return "low";
  }
  if (band === "premium") {
    return "high";
  }
  return "medium";
}

function mapRadius(scope: TripDestinationScope | null): number {
  if (scope === "domestic_near") {
    return 3200;
  }
  if (scope === "abroad") {
    return 6000;
  }
  return 4500;
}

function destinationCue(
  scope: TripDestinationScope | null,
  destinationLabel: string | null,
): string {
  if (destinationLabel?.trim()) {
    return destinationLabel.trim();
  }
  if (scope === "domestic_near") {
    return "가까운 국내";
  }
  if (scope === "domestic_far") {
    return "국내";
  }
  if (scope === "abroad") {
    return "해외";
  }
  return "여행지";
}

function baseSpec(
  resourceTypes: LocalDiscoveryActionSpec["resourceTypes"],
  plan: OneShotTripExperiencePrepPlan,
  patch?: Partial<LocalDiscoveryActionSpec>,
): LocalDiscoveryActionSpec {
  const state = plan.experienceState;
  return {
    version: 1,
    resourceTypes,
    transport: "transit",
    budget: mapBudget(state.budgetBand),
    vibe: state.funAxis === "food_market" ? "local" : "popular",
    lodgingKind: "any",
    radiusM: mapRadius(state.destinationScope),
    ...patch,
  };
}

function activityPatch(
  funAxis: TripFunAxis | null,
  dest: string,
): Partial<LocalDiscoveryActionSpec> {
  switch (funAxis) {
    case "food_market":
      return {
        activityFocus: `${dest} 로컬 시장`,
        activitySubtype: "shopping",
      };
    case "nature":
      return {
        activityFocus: `${dest} 자연`,
        activitySubtype: "park",
      };
    case "festival":
      return {
        activityFocus: `${dest} 축제`,
        activitySubtype: "nightlife",
      };
    case "culture":
      return {
        activityFocus: `${dest} 문화`,
        activitySubtype: "museum",
      };
    default:
      return {
        activityFocus: `${dest} 명소`,
        activitySubtype: "general",
      };
  }
}

function eateryPatch(funAxis: TripFunAxis | null, dest: string): Partial<LocalDiscoveryActionSpec> {
  if (funAxis === "food_market") {
    return { eateryFocus: `${dest} 현지 맛` };
  }
  return { eateryFocus: `${dest} 맛집` };
}

/** Map experience plan → parallel map scouts (lodging · eatery · activity). */
export function buildTripExperienceParallelScouts(
  plan: OneShotTripExperiencePrepPlan,
): readonly TripExperienceParallelScout[] {
  const dest = destinationCue(
    plan.experienceState.destinationScope,
    plan.experienceState.destinationLabel,
  );
  const scouts: TripExperienceParallelScout[] = [];

  for (const leg of plan.scoutLegs) {
    if (leg === "lodging") {
      scouts.push({
        leg,
        labelKo: "숙소",
        spec: baseSpec(["hotel"], plan),
      });
      continue;
    }
    if (leg === "eatery") {
      scouts.push({
        leg,
        labelKo: "맛집",
        spec: baseSpec(["restaurant"], plan, eateryPatch(plan.experienceState.funAxis, dest)),
      });
      continue;
    }
    if (leg === "activity") {
      scouts.push({
        leg,
        labelKo: "놀거리",
        spec: baseSpec(
          ["activity"],
          plan,
          activityPatch(plan.experienceState.funAxis, dest),
        ),
      });
    }
  }

  return scouts;
}
