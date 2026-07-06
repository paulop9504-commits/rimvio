import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveLocalDiscoveryAction } from "@/lib/globe/context-condition-ai/resolve-local-discovery-action";
import type { LocalDiscoveryActionSpec } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { WeatherContext } from "@/lib/context-resolver/types";
import { buildContextAgentPreflightBriefing } from "@/lib/globe/context-agent/build-context-agent-preflight-briefing";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";

export type ContextAgentZeroPromptOutcome = {
  situationLineKo: string;
  preflightBriefingKo: string;
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

/** Bound 맥락 AI — preflight briefing + optional zero-prompt auto placement. */
export function resolveContextAgentZeroPrompt(input: {
  event: EventCandidate;
  anchorPlaceName: string;
  now?: Date;
  weather?: WeatherContext | null;
}): ContextAgentZeroPromptOutcome {
  const travelBrain = buildTravelBrainState(input.event);
  const now = input.now ?? new Date();
  const hourLocal = now.getHours();
  const triggerMessage = resolveDefaultTrigger(hourLocal);
  const preflight = buildContextAgentPreflightBriefing({
    event: input.event,
    anchorPlaceName: input.anchorPlaceName,
    now,
    weather: input.weather,
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
    situationLineKo: preflight.briefingLineKo,
    preflightBriefingKo: preflight.briefingLineKo,
    triggerMessage,
    shouldAutoExecute,
    spec: resolved.status === "ready" ? resolved.spec : null,
  };
}
