import type { MarketCategoryId } from "@/lib/globe/market/market-intent-types";

export const MARKET_MEMORY_SCHEMA_VERSION = "market.memory.v1" as const;

export type MarketMemoryTemplateId =
  | "universal"
  | "camera"
  | "camping"
  | "instrument"
  | "outdoor"
  | "bike"
  | "phone"
  | "fridge";

/** @deprecated Travel-style fields — kept for read compat only. */
export type MarketMemoryUniversalStepId = "story" | "care" | "why";

export type MarketMemoryTemplate = {
  id: MarketMemoryTemplateId;
  categoryIds: readonly MarketCategoryId[];
  /** Product-specific condition prompt (listing). */
  categoryPromptKo: string;
  categoryPromptPlaceholderKo: string;
  /** Optional care / maintenance note. */
  careLabelKo: string;
  carePlaceholderKo: string;
  /** Seeking — what you want (condition-based). */
  seekingContextLabelKo: string;
  seekingContextPlaceholderKo: string;
};

const CONDITION_FIELDS = {
  careLabelKo: "상태·관리",
  carePlaceholderKo: "배터리, 사용 기간, 구성품 등 거래에 필요한 정보",
};

const TEMPLATES: readonly MarketMemoryTemplate[] = [
  {
    id: "phone",
    categoryIds: ["market.phone"],
    categoryPromptKo: "제품 상태",
    categoryPromptPlaceholderKo: "예: 배터리 85% · 케이스·충전기 포함",
    ...CONDITION_FIELDS,
    seekingContextLabelKo: "원하는 조건",
    seekingContextPlaceholderKo: "예: 배터리 85% 이상 · 정품 박스",
  },
  {
    id: "bike",
    categoryIds: ["market.bike"],
    categoryPromptKo: "제품 상태",
    categoryPromptPlaceholderKo: "예: 2022년식 · 주행 500km · 정비 완료",
    ...CONDITION_FIELDS,
    seekingContextLabelKo: "원하는 조건",
    seekingContextPlaceholderKo: "예: 로드바이크 · M 사이즈 전후",
  },
  {
    id: "camera",
    categoryIds: ["market.camera"],
    categoryPromptKo: "제품 상태",
    categoryPromptPlaceholderKo: "예: 셔터 8천 · 렌즈 포함 · 필터 없음",
    ...CONDITION_FIELDS,
    seekingContextLabelKo: "원하는 조건",
    seekingContextPlaceholderKo: "예: 풀프레임 바디 · 렌즈 키트",
  },
  {
    id: "camping",
    categoryIds: ["market.camping"],
    categoryPromptKo: "제품 상태",
    categoryPromptPlaceholderKo: "예: 사용 5회 · 방수 양호 · 수리 없음",
    ...CONDITION_FIELDS,
    seekingContextLabelKo: "원하는 조건",
    seekingContextPlaceholderKo: "예: 2인 텐트 · 방수 좋은 것",
  },
  {
    id: "instrument",
    categoryIds: ["market.instrument"],
    categoryPromptKo: "제품 상태",
    categoryPromptPlaceholderKo: "예: 습도 관리 · 케이스 포함",
    ...CONDITION_FIELDS,
    seekingContextLabelKo: "원하는 조건",
    seekingContextPlaceholderKo: "예: 입문용 · 사용감 적은 것",
  },
  {
    id: "outdoor",
    categoryIds: ["market.outdoor"],
    categoryPromptKo: "제품 상태",
    categoryPromptPlaceholderKo: "예: 안전 점검 완료 · 사용 2시즌",
    ...CONDITION_FIELDS,
    seekingContextLabelKo: "원하는 조건",
    seekingContextPlaceholderKo: "예: 등박용 · 내구성 좋은 것",
  },
  {
    id: "universal",
    categoryIds: [
      "market.general",
      "market.fashion",
      "market.furniture",
    ],
    categoryPromptKo: "제품 상태",
    categoryPromptPlaceholderKo: "예: 구매 시기 · 사용 빈도 · 포함 구성",
    ...CONDITION_FIELDS,
    seekingContextLabelKo: "원하는 조건",
    seekingContextPlaceholderKo: "예: 어떤 상태·가격대를 찾는지",
  },
];

export function resolveMarketMemoryTemplate(
  categoryId: MarketCategoryId,
  productName?: string,
): MarketMemoryTemplate {
  const name = productName?.trim() ?? "";

  if (/카메라|camera|렌즈|canon|sony|nikon/iu.test(name)) {
    return TEMPLATES.find((row) => row.id === "camera")!;
  }
  if (/캠핑|텐트|침낭|차박|camp/iu.test(name)) {
    return TEMPLATES.find((row) => row.id === "camping")!;
  }
  if (/악기|기타|피아노|바이올린|드럼|instrument/iu.test(name)) {
    return TEMPLATES.find((row) => row.id === "instrument")!;
  }
  if (/등산|배낭|아이젠|등박|hiking|outdoor/iu.test(name)) {
    return TEMPLATES.find((row) => row.id === "outdoor")!;
  }

  const byCategory = TEMPLATES.find((row) => row.categoryIds.includes(categoryId));
  if (byCategory && byCategory.id !== "universal") {
    return byCategory;
  }

  return TEMPLATES.find((row) => row.id === "universal")!;
}

export function listMarketMemoryTemplates(): readonly MarketMemoryTemplate[] {
  return TEMPLATES;
}
