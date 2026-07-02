import type { MarketCategoryId } from "@/lib/globe/market/market-intent-types";
import type { ProductCategoryId } from "@/lib/portal/compose-draft/product-category-types";

export type MarketMacroStage =
  | "chatting"
  | "intent_soft"
  | "role_confirm"
  | "category_scope"
  | "slot_fill"
  | "description_ready"
  | "publish_review"
  | "published";

export type ProductTaxonomyStatus = "unset" | "hypothesis" | "proposed" | "confirmed";

export type DescriptionDraftStatus = "idle" | "ready" | "generated" | "edited";

export type ProductTaxonomyLeafId =
  | "digital.phone.smartphone"
  | "digital.laptop.laptop"
  | "fashion.clothing.general"
  | "home.furniture.general"
  | "other.misc.general";

export type ProductTaxonomyBinding = {
  productCategoryId: ProductCategoryId;
  taxonomyLeafId: ProductTaxonomyLeafId;
  taxonomyPathKo: readonly [string, string, string];
  marketCategoryId: MarketCategoryId;
  confirmLabelKo: string;
};

const PRODUCT_TAXONOMY_BINDINGS: Record<ProductCategoryId, ProductTaxonomyBinding> = {
  smartphone: {
    productCategoryId: "smartphone",
    taxonomyLeafId: "digital.phone.smartphone",
    taxonomyPathKo: ["디지털/가전", "휴대폰", "스마트폰"],
    marketCategoryId: "market.phone",
    confirmLabelKo: "휴대폰 쪽 스마트폰",
  },
  laptop: {
    productCategoryId: "laptop",
    taxonomyLeafId: "digital.laptop.laptop",
    taxonomyPathKo: ["디지털/가전", "노트북/PC", "노트북"],
    marketCategoryId: "market.phone",
    confirmLabelKo: "노트북 쪽",
  },
  clothing: {
    productCategoryId: "clothing",
    taxonomyLeafId: "fashion.clothing.general",
    taxonomyPathKo: ["패션", "의류/잡화", "일반"],
    marketCategoryId: "market.fashion",
    confirmLabelKo: "의류/잡화 쪽",
  },
  furniture: {
    productCategoryId: "furniture",
    taxonomyLeafId: "home.furniture.general",
    taxonomyPathKo: ["가구/인테리어", "가구", "일반"],
    marketCategoryId: "market.furniture",
    confirmLabelKo: "가구 쪽",
  },
  generic: {
    productCategoryId: "generic",
    taxonomyLeafId: "other.misc.general",
    taxonomyPathKo: ["기타", "중고거래", "일반"],
    marketCategoryId: "market.general",
    confirmLabelKo: "중고 물건 쪽",
  },
};

export function resolveProductTaxonomyBinding(
  productCategoryId: ProductCategoryId | null | undefined,
): ProductTaxonomyBinding | null {
  if (!productCategoryId) {
    return null;
  }
  return PRODUCT_TAXONOMY_BINDINGS[productCategoryId] ?? null;
}

export function readProductTaxonomyPathLabelKo(
  productCategoryId: ProductCategoryId | null | undefined,
): string | null {
  const binding = resolveProductTaxonomyBinding(productCategoryId);
  if (!binding) {
    return null;
  }
  return binding.taxonomyPathKo.join(" > ");
}

export function readProductTaxonomyConfirmLabelKo(
  productCategoryId: ProductCategoryId | null | undefined,
): string | null {
  const binding = resolveProductTaxonomyBinding(productCategoryId);
  if (!binding) {
    return null;
  }
  return binding.confirmLabelKo;
}
