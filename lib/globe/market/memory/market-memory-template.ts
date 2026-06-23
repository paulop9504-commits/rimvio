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

export type MarketMemoryUniversalStepId = "story" | "care" | "why";

export type MarketMemoryTemplate = {
  id: MarketMemoryTemplateId;
  categoryIds: readonly MarketCategoryId[];
  categoryPromptKo: string;
  categoryPromptPlaceholderKo: string;
  storyLabelKo: string;
  storyPlaceholderKo: string;
  careLabelKo: string;
  carePlaceholderKo: string;
  whyLabelKo: string;
  whyPlaceholderKo: string;
  seekingContextLabelKo: string;
  seekingContextPlaceholderKo: string;
  seekingWhyLabelKo: string;
  seekingWhyPlaceholderKo: string;
};

const UNIVERSAL_STORY = {
  storyLabelKo: "함께한 순간",
  storyPlaceholderKo: "이 물건과 가장 소중했던 순간을 한 줄로",
  careLabelKo: "평소 관리",
  carePlaceholderKo: "다음 주인이 안심할 수 있게, 어떻게 돌봤는지",
  whyLabelKo: "넘기는 이유",
  whyPlaceholderKo: "다음 사람에게 어떤 경험을 바라는지",
};

const TEMPLATES: readonly MarketMemoryTemplate[] = [
  {
    id: "phone",
    categoryIds: ["market.phone"],
    categoryPromptKo: "배터리·외관 외에 꼭 전할 맥락",
    categoryPromptPlaceholderKo: "예: 케이스·충전기 포함, 업무용으로만 썼어요",
    ...UNIVERSAL_STORY,
    seekingContextLabelKo: "원하는 맥락",
    seekingContextPlaceholderKo: "예: 배터리 85% 이상, 업무용으로 쓰던 물건",
    seekingWhyLabelKo: "지금 찾는 이유",
    seekingWhyPlaceholderKo: "예: 기존 폰 교체, 가볍게 쓸 보조기",
  },
  {
    id: "bike",
    categoryIds: ["market.bike"],
    categoryPromptKo: "어디서 어떻게 탔는지",
    categoryPromptPlaceholderKo: "예: 한강 라이딩 위주, 벚꽃 시즌에 자주 탔어요",
    ...UNIVERSAL_STORY,
    seekingContextLabelKo: "원하는 라이딩 맥락",
    seekingContextPlaceholderKo: "예: 출퇴근용 로드, 2020년식 전후",
    seekingWhyLabelKo: "지금 찾는 이유",
    seekingWhyPlaceholderKo: "예: 봄철 출퇴근용",
  },
  {
    id: "camera",
    categoryIds: ["market.camera"],
    categoryPromptKo: "렌즈·작품 맥락",
    categoryPromptPlaceholderKo: "예: 이 바디로 찍은 작품 중 마음에 드는 사진 3장",
    ...UNIVERSAL_STORY,
    seekingContextLabelKo: "원하는 촬영 맥락",
    seekingContextPlaceholderKo: "예: 여행·거리 스냅용, 렌즈 상태 중요",
    seekingWhyLabelKo: "지금 찾는 이유",
    seekingWhyPlaceholderKo: "예: 여행 전 바디 교체",
  },
  {
    id: "camping",
    categoryIds: ["market.camping"],
    categoryPromptKo: "함께한 캠핑지·사용 횟수",
    categoryPromptPlaceholderKo: "예: 강원도 차박 5회, 텐트 상태 양호",
    ...UNIVERSAL_STORY,
    seekingContextLabelKo: "원하는 캠핑 맥락",
    seekingContextPlaceholderKo: "예: 2인 차박용, 방수 좋은 텐트",
    seekingWhyLabelKo: "지금 찾는 이유",
    seekingWhyPlaceholderKo: "예: 이번 여름 차박 준비",
  },
  {
    id: "instrument",
    categoryIds: ["market.instrument"],
    categoryPromptKo: "연주·보관 맥락",
    categoryPromptPlaceholderKo: "예: 습도 관리했고, 재즈 연주할 때 가장 즐거웠어요",
    ...UNIVERSAL_STORY,
    seekingContextLabelKo: "원하는 연주 맥락",
    seekingContextPlaceholderKo: "예: 입문용 기타, 사용감 적은 것",
    seekingWhyLabelKo: "지금 찾는 이유",
    seekingWhyPlaceholderKo: "예: 취미 시작",
  },
  {
    id: "outdoor",
    categoryIds: ["market.outdoor"],
    categoryPromptKo: "다녀온 산·안전 상태",
    categoryPromptPlaceholderKo: "예: 북한산 등반 때 든든했고, 안전 점검 완료",
    ...UNIVERSAL_STORY,
    seekingContextLabelKo: "원하는 등산·아웃도어 맥락",
    seekingContextPlaceholderKo: "예: 겨울 등산용 등박, 내구성 좋은 것",
    seekingWhyLabelKo: "지금 찾는 이유",
    seekingWhyPlaceholderKo: "예: 다음 달 등산 준비",
  },
  {
    id: "universal",
    categoryIds: [
      "market.general",
      "market.fashion",
      "market.furniture",
    ],
    categoryPromptKo: "이 물건만의 맥락",
    categoryPromptPlaceholderKo: "예: 냉장고에 자주 담았던 음식, 우리 집에서의 역할",
    ...UNIVERSAL_STORY,
    seekingContextLabelKo: "원하는 맥락",
    seekingContextPlaceholderKo: "예: 어떤 순간·장소에서 쓰일 물건인지",
    seekingWhyLabelKo: "지금 찾는 이유",
    seekingWhyPlaceholderKo: "예: 지금 필요한 이유 한 줄",
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
