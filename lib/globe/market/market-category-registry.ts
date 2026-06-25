import type { MarketCategoryId } from "@/lib/globe/market/market-intent-types";

const RULES: ReadonlyArray<{
  id: MarketCategoryId;
  pattern: RegExp;
}> = [
  {
    id: "market.phone",
    pattern:
      /아이폰|iphone|갤럭시|galaxy|스마트폰|폰\b|ipad|아이패드|맥북|macbook|노트북|laptop/iu,
  },
  { id: "market.bike", pattern: /자전거|바이크|bike|전동킥|킥보드/iu },
  {
    id: "market.camera",
    pattern: /카메라|camera|렌즈|lens|canon|sony|nikon|fuji|leica|gopro|a7m|a7\b|alpha/iu,
  },
  {
    id: "market.camping",
    pattern: /캠핑|텐트|침낭|차박|camp|coleman|helinox|버너|랜턴/iu,
  },
  {
    id: "market.instrument",
    pattern: /악기|기타|피아노|바이올린|드럼|instrument|synth|midi|ukulele/iu,
  },
  {
    id: "market.outdoor",
    pattern: /등산|배낭|아이젠|등박|hiking|outdoor|트레킹|등산화|shell/iu,
  },
  { id: "market.furniture", pattern: /가구|의자|책상|소파|침대|테이블|수납|냉장고|세탁/iu },
  { id: "market.fashion", pattern: /옷|신발|가방|패딩|코트|티셔츠|운동화|명품/iu },
];

const COMPAT_GROUPS: readonly (readonly MarketCategoryId[])[] = [
  ["market.general", "market.fashion", "market.furniture"],
  ["market.camera", "market.general"],
  ["market.camping", "market.general", "market.outdoor"],
  ["market.instrument", "market.general"],
  ["market.outdoor", "market.general", "market.camping"],
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
  if (a === b) {
    return true;
  }
  if (a === "market.general" || b === "market.general") {
    return true;
  }
  for (const group of COMPAT_GROUPS) {
    if (group.includes(a) && group.includes(b)) {
      return true;
    }
  }
  return false;
}

export function marketCategoryLabelKo(id: MarketCategoryId): string {
  switch (id) {
    case "market.phone":
      return "디지털";
    case "market.bike":
      return "자전거";
    case "market.camera":
      return "카메라";
    case "market.camping":
      return "캠핑";
    case "market.instrument":
      return "악기";
    case "market.outdoor":
      return "등산·아웃도어";
    case "market.furniture":
      return "가구·가전";
    case "market.fashion":
      return "패션";
    default:
      return "기타";
  }
}

export const MARKET_CATEGORY_OPTIONS: readonly MarketCategoryId[] = [
  "market.phone",
  "market.bike",
  "market.camera",
  "market.camping",
  "market.instrument",
  "market.outdoor",
  "market.furniture",
  "market.fashion",
  "market.general",
];
