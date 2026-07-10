import { isGroceryPrepUtterance } from "@/lib/globe/grocery-prep/detect-grocery-prep-utterance";
import { inferDishFromMessage } from "@/lib/globe/grocery-prep/infer-dish-from-message";
import type { GroceryPrepGapId, GroceryPrepState } from "@/lib/globe/grocery-prep/types";

export type OneShotGroceryPrepPlan = {
  readonly message: string;
  readonly state: GroceryPrepState;
  readonly gaps: readonly GroceryPrepGapId[];
  readonly readyForScout: boolean;
};

/** Pure plan — dish utterance → ingredient list → cart scout readiness. */
export function planOneShotGroceryPrep(input: {
  message: string;
  servings?: number | null;
}): OneShotGroceryPrepPlan | null {
  const message = input.message.trim();
  if (!message || !isGroceryPrepUtterance(message)) {
    return null;
  }

  const dish = inferDishFromMessage(message);
  const state: GroceryPrepState = {
    dishId: dish?.dishId ?? null,
    dishLabel: dish?.dishLabel ?? null,
    servings: input.servings ?? 2,
    ingredients: dish?.ingredients ?? [],
  };

  const gaps: GroceryPrepGapId[] = [];
  if (!state.dishId) {
    gaps.push("dish");
  }
  if (!state.servings) {
    gaps.push("servings");
  }

  const readyForScout =
    state.dishId != null && state.ingredients.length > 0 && state.servings != null;

  return {
    message,
    state,
    gaps,
    readyForScout,
  };
}
