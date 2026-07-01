import type {
  ComposeSlotId,
  ProductCategoryId,
} from "@/lib/portal/compose-draft/product-category-types";

export type SlotChoiceOption = {
  id: string;
  labelKo: string;
};

const STORAGE_CHOICES: readonly SlotChoiceOption[] = [
  { id: "128gb", labelKo: "128GB" },
  { id: "256gb", labelKo: "256GB" },
  { id: "512gb", labelKo: "512GB" },
  { id: "1tb", labelKo: "1TB" },
];

const SIZE_CHOICES: readonly SlotChoiceOption[] = [
  { id: "xs", labelKo: "XS" },
  { id: "s", labelKo: "S" },
  { id: "m", labelKo: "M" },
  { id: "l", labelKo: "L" },
  { id: "xl", labelKo: "XL" },
  { id: "free", labelKo: "FREE" },
];

const CONDITION_CHOICES: readonly SlotChoiceOption[] = [
  { id: "mint", labelKo: "거의 새것" },
  { id: "good", labelKo: "상태 좋음" },
  { id: "used", labelKo: "사용감 있음" },
];

const CATEGORY_CONFIRM_CHOICES: readonly SlotChoiceOption[] = [
  { id: "yes", labelKo: "맞아요" },
  { id: "no", labelKo: "아니요" },
];

const SLOT_CHOICES: Partial<
  Record<ProductCategoryId, Partial<Record<ComposeSlotId, readonly SlotChoiceOption[]>>>
> = {
  smartphone: {
    storage: STORAGE_CHOICES,
    condition: CONDITION_CHOICES,
  },
  clothing: {
    sizeLabel: SIZE_CHOICES,
    condition: CONDITION_CHOICES,
  },
  laptop: {
    condition: CONDITION_CHOICES,
  },
  furniture: {
    condition: CONDITION_CHOICES,
  },
  generic: {
    condition: CONDITION_CHOICES,
  },
};

export function readSlotChoices(input: {
  categoryId: ProductCategoryId;
  slotId: ComposeSlotId;
}): readonly SlotChoiceOption[] | null {
  const choices = SLOT_CHOICES[input.categoryId]?.[input.slotId];
  return choices?.length ? choices : null;
}

export function readCategoryConfirmChoices(): readonly SlotChoiceOption[] {
  return CATEGORY_CONFIRM_CHOICES;
}

export function resolveSlotChoiceLabel(
  choices: readonly SlotChoiceOption[],
  answer: string,
): string | null {
  const trimmed = answer.trim();
  if (!trimmed) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  const byId = choices.find((choice) => choice.id.toLowerCase() === lower);
  if (byId) {
    return byId.labelKo;
  }
  const byLabel = choices.find(
    (choice) => choice.labelKo.toLowerCase() === lower,
  );
  return byLabel?.labelKo ?? null;
}
