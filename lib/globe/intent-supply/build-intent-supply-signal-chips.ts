import type { UnifiedExperienceContext } from "@/lib/experience-context/unified-experience-context-types";
import type { GlobeMapIntent } from "@/lib/globe/intent-supply/globe-map-intent-types";
import { copy } from "@/lib/copy/human-ko";

/** Context-linked chips shown on map prompt rail after intent parse. */
export function buildIntentSupplySignalChips(input: {
  unified: UnifiedExperienceContext;
  intent: GlobeMapIntent;
}): string[] {
  const chips: string[] = [copy.globe.intentSupplyChipLocation];

  const matchedName =
    input.unified.matchedPeople[0]?.displayName ??
    input.unified.personExperienceSlice[0]?.displayName ??
    null;

  if (matchedName) {
    chips.push(copy.globe.intentSupplyChipPerson(matchedName));
  }

  if (input.unified.memoryHits.length > 0) {
    chips.push(copy.globe.intentSupplyChipMemory);
  }

  const trajectory = input.unified.behaviorKernel.state.trajectory;
  if (trajectory.strength > 0.15 && trajectory.dominant_cluster !== "unknown") {
    chips.push(copy.globe.intentSupplyChipTrajectory(trajectory.dominant_cluster));
  }

  switch (input.intent.supplyTarget) {
    case "lodging":
      chips.push(copy.globe.intentSupplyChipLodging);
      break;
    case "eatery":
      chips.push(copy.globe.intentSupplyChipFood);
      break;
    case "memory":
      chips.push(copy.globe.intentSupplyChipRecall);
      break;
    case "context":
      chips.push(copy.globe.intentSupplyChipContext);
      break;
    default:
      break;
  }

  return [...new Set(chips)];
}

export function resolveIntentLabelKo(intent: GlobeMapIntent): string {
  switch (intent.kind) {
    case "lodging_supply":
      return copy.globe.intentSupplyLabelLodging;
    case "place_food_supply":
      return copy.globe.intentSupplyLabelFood;
    case "people_recall":
      return copy.globe.intentSupplyLabelRecall;
    case "context_connect":
      return copy.globe.intentSupplyLabelContext;
    case "market_compose":
      return copy.globe.intentSupplyLabelMarket;
    case "navigation_action":
      return copy.globe.intentSupplyLabelNavigation;
    default:
      return copy.globe.intentSupplyLabelContext;
  }
}
