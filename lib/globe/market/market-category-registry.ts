import type { MarketCategoryId } from "@/lib/globe/market/market-intent-types";

const RULES: ReadonlyArray<{
  id: MarketCategoryId;
  pattern: RegExp;
}> = [
  { id: "market.phone", pattern: /아이폰|iphone|갤럭시|galaxy|스마트폰|폰\b|ipad|아이패드|맥북|macbook|노트북|laptop/iu },
  { id: "market.bike", pattern: /자전거|바이크|bike|전동킥|킥보드/iu },
  { id: "market.furniture", pattern: /가구|의자|책상|소파|침대|테이블|수납/iu },
  { id: "market.fashion", pattern: /옷|신발|가방|패딩|코트|티셔츠|운동화|명품/iu },
];

export function resolveMarketCategoryId(text: string): MarketCategoryId {
  const trimmed = text.trim();
  if (!trimmed) {
    return "market.general";
  }
  for (const rule of RULES) {
    if (rule.pattern.test(trimmed)) {
      return rule.id;
    }
  }
  return "market.general";
}

export function marketCategoriesCompatible(
  a: MarketCategoryId,
  b: MarketCategoryId,
): boolean {
  if (a === "market.general" || b === "market.general") {
    return true;
  }
  return a === b;
}

export function marketCategoryLabelKo(id: MarketCategoryId): string {
  switch (id) {
    case "market.phone":
      return "디지털";
    case "market.bike":
      return "자전거";
    case "market.furniture":
      return "가구";
    case "market.fashion":
      return "패션";
    default:
      return "기타";
  }
}

export const MARKET_CATEGORY_OPTIONS: readonly MarketCategoryId[] = [
  "market.phone",
  "market.bike",
  "market.furniture",
  "market.fashion",
  "market.general",
];
