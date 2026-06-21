/** Food domain — find → go → ride (no hub; playbook uses @ featureIds). */
export const FOOD_ACTION_SEQUENCE = ["meal", "navigate", "taxi"] as const;

export type FoodPlaybookFeatureId = (typeof FOOD_ACTION_SEQUENCE)[number];

export const FOOD_ACTION_LABELS: Record<FoodPlaybookFeatureId, string> = {
  meal: "맛집",
  navigate: "길찾기",
  taxi: "택시",
};
