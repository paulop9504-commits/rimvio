import { copy } from "@/lib/copy/human-ko";
import type {
  ComposeSlotId,
  ProductCategoryId,
  ProductCategorySchema,
} from "@/lib/portal/compose-draft/product-category-types";

const SMARTPHONE: ProductCategorySchema = {
  id: "smartphone",
  labelKo: "스마트폰",
  classifyPattern:
    /(?:아이폰|iphone|갤럭시|galaxy|pixel|핸드폰|스마트폰|폰\s*\d|z\s*flip|z\s*fold)/iu,
  requiredSlots: ["productName", "priceKrw", "condition", "placeLabel"],
  optionalSlots: ["storage", "note"],
  slotOrder: ["productName", "storage", "condition", "priceKrw", "placeLabel", "note"],
  questions: {
    productName: copy.portal.slotAskProductName,
    storage: copy.portal.slotAskStorage,
    condition: copy.portal.slotAskCondition,
    priceKrw: copy.portal.slotAskPrice,
    placeLabel: copy.portal.slotAskPlace,
    note: copy.portal.slotAskNoteOptional,
  },
};

const LAPTOP: ProductCategorySchema = {
  id: "laptop",
  labelKo: "노트북",
  classifyPattern: /(?:맥북|macbook|노트북|laptop|그램|울트라북|surface)/iu,
  requiredSlots: ["productName", "priceKrw", "condition", "placeLabel"],
  optionalSlots: ["cpuRam", "note"],
  slotOrder: ["productName", "cpuRam", "condition", "priceKrw", "placeLabel", "note"],
  questions: {
    productName: copy.portal.slotAskProductName,
    cpuRam: copy.portal.slotAskCpuRam,
    condition: copy.portal.slotAskLaptopCondition,
    priceKrw: copy.portal.slotAskPrice,
    placeLabel: copy.portal.slotAskPlace,
    note: copy.portal.slotAskNoteOptional,
  },
};

const CLOTHING: ProductCategorySchema = {
  id: "clothing",
  labelKo: "의류",
  classifyPattern:
    /(?:옷|의류|자켓|코트|패딩|니트|셔츠|바지|청바지|원피|드레스|운동화|신발|가방|백팩)/iu,
  requiredSlots: ["productName", "priceKrw", "condition", "placeLabel"],
  optionalSlots: ["sizeLabel", "note"],
  slotOrder: ["productName", "sizeLabel", "condition", "priceKrw", "placeLabel", "note"],
  questions: {
    productName: copy.portal.slotAskClothingItem,
    sizeLabel: copy.portal.slotAskClothingSize,
    condition: copy.portal.slotAskClothingCondition,
    priceKrw: copy.portal.slotAskPrice,
    placeLabel: copy.portal.slotAskPlace,
    note: copy.portal.slotAskNoteOptional,
  },
};

const FURNITURE: ProductCategorySchema = {
  id: "furniture",
  labelKo: "가구",
  classifyPattern:
    /(?:가구|책상|의자|소파|침대|수납|선반|테이블|서랍|책장|매트리스)/iu,
  requiredSlots: ["productName", "priceKrw", "placeLabel"],
  optionalSlots: ["condition", "note"],
  slotOrder: ["productName", "condition", "priceKrw", "placeLabel", "note"],
  questions: {
    productName: copy.portal.slotAskFurnitureItem,
    condition: copy.portal.slotAskFurnitureCondition,
    priceKrw: copy.portal.slotAskPrice,
    placeLabel: copy.portal.slotAskPlacePickup,
    note: copy.portal.slotAskNoteOptional,
  },
};

const GENERIC: ProductCategorySchema = {
  id: "generic",
  labelKo: "중고거래",
  classifyPattern: /.^/,
  requiredSlots: ["productName", "priceKrw", "placeLabel"],
  optionalSlots: ["condition", "note"],
  slotOrder: ["productName", "condition", "priceKrw", "placeLabel", "note"],
  questions: {
    productName: copy.portal.slotAskProductName,
    condition: copy.portal.slotAskCondition,
    priceKrw: copy.portal.slotAskPrice,
    placeLabel: copy.portal.slotAskPlace,
    note: copy.portal.slotAskNoteOptional,
  },
};

const REGISTRY: Record<ProductCategoryId, ProductCategorySchema> = {
  smartphone: SMARTPHONE,
  laptop: LAPTOP,
  clothing: CLOTHING,
  furniture: FURNITURE,
  generic: GENERIC,
};

const ORDER: ProductCategoryId[] = [
  "smartphone",
  "laptop",
  "clothing",
  "furniture",
  "generic",
];

export function getProductCategorySchema(id: ProductCategoryId): ProductCategorySchema {
  return REGISTRY[id];
}

export function classifyProductCategory(text: string): ProductCategoryId {
  const trimmed = text.trim();
  if (!trimmed) {
    return "generic";
  }
  for (const id of ORDER) {
    if (id === "generic") {
      continue;
    }
    if (REGISTRY[id].classifyPattern.test(trimmed)) {
      return id;
    }
  }
  return "generic";
}

export function listPickableProductCategories(): ProductCategoryId[] {
  return ORDER.filter((id) => id !== "generic");
}

export function listAllProductCategories(): ProductCategoryId[] {
  return [...ORDER];
}

export function listSlotsForMode(
  schema: ProductCategorySchema,
  detailMode: boolean,
): ComposeSlotId[] {
  const required = [...schema.requiredSlots];
  if (!detailMode) {
    return required;
  }
  const optional = schema.optionalSlots.filter((slot) => !required.includes(slot));
  return [...required, ...optional];
}
