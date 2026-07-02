import type { ProductCategoryId } from "@/lib/portal/compose-draft/product-category-types";
import {
  getProductCategorySchema,
  listPickableProductCategories,
} from "@/lib/portal/compose-draft/product-category-registry";
import { resolveSlotChoiceLabel } from "@/lib/portal/compose-draft/slot-choice-registry";

const AFFIRM =
  /(?:^(?:네|응|예|맞아요?|맞습니다|그래요?|ok|yes)$|맞아요|맞습니다|그렇습니다)/iu;
const DENY = /(?:^(?:아니요?|아뇨|틀려요?|다시|no)$|아니요|아닙니다|다른)/iu;

export function parseCategoryConfirmResponse(
  text: string,
): "yes" | "no" | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const chip = resolveSlotChoiceLabel(
    [
      { id: "yes", labelKo: "맞아요" },
      { id: "no", labelKo: "아니요" },
    ],
    trimmed,
  );
  if (chip === "맞아요") {
    return "yes";
  }
  if (chip === "아니요") {
    return "no";
  }
  if (AFFIRM.test(trimmed)) {
    return "yes";
  }
  if (DENY.test(trimmed)) {
    return "no";
  }
  return null;
}

export function parseCategoryPickResponse(text: string): ProductCategoryId | null {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  for (const id of listPickableProductCategories()) {
    if (id.toLowerCase() === trimmed) {
      return id;
    }
    const label = getProductCategorySchema(id).labelKo.toLowerCase();
    if (label === trimmed || trimmed.includes(label)) {
      return id;
    }
  }
  if (trimmed === "기타" || trimmed === "기타에요" || trimmed === "기타예요") {
    return "generic";
  }
  return null;
}
