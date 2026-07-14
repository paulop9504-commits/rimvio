import { resolveInstantEateryFocus } from "@/lib/globe/context-condition-ai/instant-eatery-search";
import { isEateryPrepUtterance } from "@/lib/globe/eatery-prep/is-eatery-prep-utterance";

export type OneShotEateryPrepStep = "parse_eatery_intent" | "ready_for_scout";

export type OneShotEateryPrepPlan = {
  readonly message: string;
  readonly cuisineFocus: string | null;
  readonly readyForScout: boolean;
  readonly steps: readonly OneShotEateryPrepStep[];
};

/** Pure plan — eatery utterance → instant scout (no slot gaps). */
export function planOneShotEateryPrep(input: {
  message: string;
}): OneShotEateryPrepPlan | null {
  const message = input.message.trim();
  if (!message || !isEateryPrepUtterance(message)) {
    return null;
  }
  return {
    message,
    cuisineFocus: resolveInstantEateryFocus(message),
    readyForScout: true,
    steps: ["parse_eatery_intent", "ready_for_scout"],
  };
}
