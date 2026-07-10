export type GroceryDishId = "jjimdak" | "unknown";

export type GroceryIngredientLine = {
  readonly id: string;
  readonly labelKo: string;
  readonly quantityLabel: string;
};

export type GroceryPrepState = {
  readonly dishId: GroceryDishId | null;
  readonly dishLabel: string | null;
  readonly servings: number | null;
  readonly ingredients: readonly GroceryIngredientLine[];
};

export type GroceryPrepGapId = "dish" | "servings" | "pantry";
