import { resolveInstantPoiFocus } from "@/lib/globe/context-condition-ai/instant-poi-search";
import { isAmenityPrepUtterance } from "@/lib/globe/amenity-prep/is-amenity-prep-utterance";

export type OneShotAmenityPrepStep = "parse_amenity_intent" | "ready_for_scout";

export type OneShotAmenityPrepPlan = {
  readonly message: string;
  readonly amenityFocus: string | null;
  readonly readyForScout: boolean;
  readonly steps: readonly OneShotAmenityPrepStep[];
};

/** Pure plan — amenity utterance → instant scout (no slot gaps). */
export function planOneShotAmenityPrep(input: {
  message: string;
}): OneShotAmenityPrepPlan | null {
  const message = input.message.trim();
  if (!message || !isAmenityPrepUtterance(message)) {
    return null;
  }
  const amenityFocus = resolveInstantPoiFocus(message);
  return {
    message,
    amenityFocus,
    readyForScout: true,
    steps: ["parse_amenity_intent", "ready_for_scout"],
  };
}
