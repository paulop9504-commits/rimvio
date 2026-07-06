import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveLocalDiscoveryAction } from "@/lib/globe/context-condition-ai/resolve-local-discovery-action";
import type { LocalDiscoveryActionSpec } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  buildTravelBrainState,
  type TravelBrainState,
} from "@/lib/situation-projection/travel-brain-personalization";

export type ContextAgentZeroPromptOutcome = {
  situationLineKo: string;
  triggerMessage: string;
  shouldAutoExecute: boolean;
  spec: LocalDiscoveryActionSpec | null;
};

const CONFIDENCE_AUTO = 0.58;

function mapMobility(value: string | undefined): "walk" | "car" | "transit" | null {
  if (value === "walk" || value === "transit" || value === "taxi" || value === "mixed") {
    if (value === "taxi") {
      return "car";
    }
    if (value === "mixed") {
      return "transit";
    }
    return value;
  }
  return null;
}

function mapBudget(value: string | undefined): "low" | "medium" | "high" | null {
  if (value === "value") {
    return "low";
  }
  if (value === "premium") {
    return "high";
  }
  if (value === "balanced") {
    return "medium";
  }
  return null;
}

function resolveDefaultTrigger(hourLocal: number): string {
  if (hourLocal >= 17 && hourLocal <= 22) {
    return "근처 저녁 맛집 찾아줘";
  }
  if (hourLocal >= 11 && hourLocal <= 14) {
    return "근처 점심 맛집 찾아줘";
  }
  if (hourLocal >= 6 && hourLocal <= 10) {
    return "근처 카페 찾아줘";
  }
  return "근처 맛집이랑 숙소 찾아줘";
}

function budgetLabelKo(value: string): string | null {
  if (value === "value") {
    return "가성비";
  }
  if (value === "premium") {
    return "넉넉한 예산";
  }
  if (value === "balanced") {
    return "보통 예산";
  }
  return null;
}

function mobilityLabelKo(value: string): string | null {
  if (value === "walk") {
    return "도보";
  }
  if (value === "transit") {
    return "대중교통";
  }
  if (value === "taxi" || value === "mixed") {
    return "차량";
  }
  return null;
}

/** Bound 맥락 AI — situation line + optional zero-prompt auto placement. */
export function resolveContextAgentZeroPrompt(input: {
  event: EventCandidate;
  anchorPlaceName: string;
  now?: Date;
}): ContextAgentZeroPromptOutcome {
  const travelBrain = buildTravelBrainState(input.event);
  const hourLocal = (input.now ?? new Date()).getHours();
  const triggerMessage = resolveDefaultTrigger(hourLocal);
  const situationLineKo = buildSituationLine({
    travelBrain,
    anchorPlaceName: input.anchorPlaceName,
    hourLocal,
  });

  const resolved = resolveLocalDiscoveryAction({
    message: triggerMessage,
    mobilityConfidence: travelBrain.slots.mobility_style.confidence,
    budgetConfidence: travelBrain.slots.budget_band.confidence,
    foodConfidence: travelBrain.slots.food_bias.confidence,
    lodgingConfidence: travelBrain.slots.lodging_priority.confidence,
    inferredTransport: mapMobility(travelBrain.slots.mobility_style.value),
    inferredBudget: mapBudget(travelBrain.slots.budget_band.value),
    inferredVibe:
      travelBrain.slots.food_bias.value === "local"
        ? "local"
        : travelBrain.slots.food_bias.value === "value"
          ? "popular"
          : "popular",
  });

  const slotConfidenceReady =
    travelBrain.slots.mobility_style.confidence >= CONFIDENCE_AUTO &&
    travelBrain.slots.budget_band.confidence >= CONFIDENCE_AUTO &&
    travelBrain.slots.food_bias.confidence >= CONFIDENCE_AUTO;

  const shouldAutoExecute =
    resolved.status === "ready" && (slotConfidenceReady || travelBrain.slots.budget_band.source === "learned");

  return {
    situationLineKo,
    triggerMessage,
    shouldAutoExecute,
    spec: resolved.status === "ready" ? resolved.spec : null,
  };
}

function buildSituationLine(input: {
  travelBrain: TravelBrainState;
  anchorPlaceName: string;
  hourLocal: number;
}): string {
  const cues: string[] = [];
  if (input.hourLocal >= 17 && input.hourLocal <= 22) {
    cues.push("저녁 시간이라");
  } else if (input.hourLocal >= 11 && input.hourLocal <= 14) {
    cues.push("점심 시간이라");
  } else if (input.hourLocal >= 6 && input.hourLocal <= 10) {
    cues.push("아침 시간이라");
  }

  const mobility = mobilityLabelKo(input.travelBrain.slots.mobility_style.value);
  if (
    mobility &&
    input.travelBrain.slots.mobility_style.confidence >= CONFIDENCE_AUTO
  ) {
    cues.push(`${mobility} 기준으로`);
  }

  const budget = budgetLabelKo(input.travelBrain.slots.budget_band.value);
  if (
    budget &&
    (input.travelBrain.slots.budget_band.confidence >= CONFIDENCE_AUTO ||
      input.travelBrain.slots.budget_band.source === "learned")
  ) {
    cues.push(budget);
  }

  const place = input.anchorPlaceName.trim() || "이 근처";
  if (cues.length === 0) {
    return `${place} 근처 후보를 지도에 꽂아둘게요.`;
  }
  return `${cues.join(" · ")} — ${place} 근처 후보를 지도에 꽂아둘게요.`;
}
