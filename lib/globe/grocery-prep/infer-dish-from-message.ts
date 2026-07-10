import type { GroceryDishId, GroceryIngredientLine } from "@/lib/globe/grocery-prep/types";

const JJIMDAK_INGREDIENTS: readonly GroceryIngredientLine[] = [
  { id: "chicken", labelKo: "닭", quantityLabel: "1마리" },
  { id: "potato", labelKo: "감자", quantityLabel: "2개" },
  { id: "glass_noodle", labelKo: "당면", quantityLabel: "1묶음" },
  { id: "onion", labelKo: "양파", quantityLabel: "1개" },
  { id: "green_onion", labelKo: "대파", quantityLabel: "1대" },
  { id: "garlic", labelKo: "마늘", quantityLabel: "6쪽" },
  { id: "gochujang", labelKo: "고추장", quantityLabel: "2큰술" },
  { id: "soy", labelKo: "간장", quantityLabel: "3큰술" },
];

export function inferDishFromMessage(message: string): {
  dishId: GroceryDishId;
  dishLabel: string;
  ingredients: readonly GroceryIngredientLine[];
} | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  if (/찜닭/iu.test(text)) {
    return {
      dishId: "jjimdak",
      dishLabel: "찜닭",
      ingredients: JJIMDAK_INGREDIENTS,
    };
  }
  return null;
}
