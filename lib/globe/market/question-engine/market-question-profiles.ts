import type { MarketQuestionCategoryProfile } from "@/lib/globe/market/question-engine/types";

const SMARTPHONE_FACTORS = [
  {
    key: "batteryHealth",
    slotId: "battery_health",
    baseWeight: 0.92,
    questionSeekingKo: "배터리 효율은 몇 % 이상을 원하시나요?",
    questionListingKo: "배터리 효율은 어느 정도인가요?",
  },
  {
    key: "storageCapacity",
    slotId: "storage_gb",
    baseWeight: 0.88,
    questionSeekingKo: "저장 용량은 어느 정도를 원하시나요?",
    questionListingKo: "저장 용량은 얼마인가요?",
  },
  {
    key: "scratchLevel",
    slotId: "cosmetic_grade",
    baseWeight: 0.75,
    questionSeekingKo: "외관 상태는 어느 수준을 원하시나요?",
    questionListingKo: "외관 상태는 어느 정도인가요?",
  },
  {
    key: "price",
    slotId: "price",
    baseWeight: 0.7,
    questionSeekingKo: "생각하시는 가격 범위는 어느 정도인가요?",
    questionListingKo: "희망 가격은 어느 정도인가요?",
  },
  {
    key: "usagePeriod",
    slotId: "model_year",
    baseWeight: 0.55,
    questionSeekingKo: "사용기간은 어느 정도까지 괜찮으신가요?",
    questionListingKo: "얼마나 사용하셨나요?",
    minImportance: 0.16,
  },
  {
    key: "repairHistory",
    slotId: "repair_history",
    baseWeight: 0.45,
    questionSeekingKo: "수리 이력은 어떻게 생각하시나요?",
    questionListingKo: "수리나 AS 이력이 있나요?",
    minImportance: 0.14,
  },
] as const satisfies MarketQuestionCategoryProfile["factors"];

const VEHICLE_FACTORS = [
  {
    key: "mileage",
    slotId: "working_state",
    baseWeight: 0.9,
    questionSeekingKo: "주행거리는 어느 정도까지 괜찮으신가요?",
    questionListingKo: "주행거리는 어느 정도인가요?",
  },
  {
    key: "accidentHistory",
    slotId: "repair_history",
    baseWeight: 0.86,
    questionSeekingKo: "사고 이력은 어떻게 생각하시나요?",
    questionListingKo: "사고나 수리 이력이 있나요?",
  },
  {
    key: "modelYear",
    slotId: "model_year",
    baseWeight: 0.72,
    questionSeekingKo: "연식은 어느 정도를 원하시나요?",
    questionListingKo: "연식은 언제쯤인가요?",
  },
  {
    key: "price",
    slotId: "price",
    baseWeight: 0.68,
    questionSeekingKo: "생각하시는 가격 범위는 어느 정도인가요?",
    questionListingKo: "희망 가격은 어느 정도인가요?",
  },
] as const satisfies MarketQuestionCategoryProfile["factors"];

const CAMERA_FACTORS = [
  {
    key: "shutterCount",
    slotId: "working_state",
    baseWeight: 0.88,
    questionSeekingKo: "셔터·사용 컷수는 어느 정도까지 괜찮으신가요?",
    questionListingKo: "셔터 컷수나 사용량은 어느 정도인가요?",
  },
  {
    key: "sensorState",
    slotId: "condition_abc",
    baseWeight: 0.82,
    questionSeekingKo: "센서·외관 상태는 어느 수준을 원하시나요?",
    questionListingKo: "센서와 외관 상태는 어느 정도인가요?",
  },
  {
    key: "bundle",
    slotId: "size_type",
    baseWeight: 0.6,
    questionSeekingKo: "필요한 구성품(렌즈·박스 등)이 있나요?",
    questionListingKo: "함께 드리는 구성품이 있나요?",
    minImportance: 0.14,
  },
  {
    key: "price",
    slotId: "price",
    baseWeight: 0.7,
    questionSeekingKo: "생각하시는 가격 범위는 어느 정도인가요?",
    questionListingKo: "희망 가격은 어느 정도인가요?",
  },
] as const satisfies MarketQuestionCategoryProfile["factors"];

const CAMPING_FACTORS = [
  {
    key: "usageCount",
    slotId: "working_state",
    baseWeight: 0.85,
    questionSeekingKo: "사용 횟수나 상태는 어느 정도까지 괜찮으신가요?",
    questionListingKo: "얼마나 사용하셨나요?",
  },
  {
    key: "condition",
    slotId: "condition_abc",
    baseWeight: 0.78,
    questionSeekingKo: "제품 상태는 어느 수준을 원하시나요?",
    questionListingKo: "제품 상태는 어느 정도인가요?",
  },
  {
    key: "price",
    slotId: "price",
    baseWeight: 0.65,
    questionSeekingKo: "생각하시는 가격 범위는 어느 정도인가요?",
    questionListingKo: "희망 가격은 어느 정도인가요?",
  },
] as const satisfies MarketQuestionCategoryProfile["factors"];

const GENERAL_FACTORS = [
  {
    key: "price",
    slotId: "price",
    baseWeight: 0.8,
    questionSeekingKo: "생각하시는 가격 범위는 어느 정도인가요?",
    questionListingKo: "희망 가격은 어느 정도인가요?",
  },
  {
    key: "condition",
    slotId: "condition_abc",
    baseWeight: 0.72,
    questionSeekingKo: "상태는 어느 수준을 원하시나요?",
    questionListingKo: "상품 상태는 어느 정도인가요?",
  },
  {
    key: "distance",
    slotId: "distance",
    baseWeight: 0.35,
    questionSeekingKo: "직거래 거리는 어느 정도까지 괜찮으신가요?",
    questionListingKo: "만나기 좋은 거리는 어디쯤인가요?",
    minImportance: 0.18,
  },
] as const satisfies MarketQuestionCategoryProfile["factors"];

export const MARKET_QUESTION_PROFILES: Record<
  import("@/lib/globe/market/question-engine/types").MarketQuestionEngineCategorySlug,
  MarketQuestionCategoryProfile
> = {
  smartphone: {
    slug: "smartphone",
    categoryId: "market.phone",
    factors: SMARTPHONE_FACTORS,
  },
  laptop: {
    slug: "laptop",
    categoryId: "market.phone",
    factors: SMARTPHONE_FACTORS,
  },
  camera: {
    slug: "camera",
    categoryId: "market.camera",
    factors: CAMERA_FACTORS,
  },
  vehicle: {
    slug: "vehicle",
    categoryId: "market.general",
    factors: VEHICLE_FACTORS,
  },
  camping: {
    slug: "camping",
    categoryId: "market.camping",
    factors: CAMPING_FACTORS,
  },
  fashion: {
    slug: "fashion",
    categoryId: "market.fashion",
    factors: [
      {
        key: "colorDesign",
        slotId: "color_design",
        baseWeight: 0.55,
        questionSeekingKo: "원하는 색상·디자인이 있나요?",
        questionListingKo: "색상·디자인을 알려 주세요",
        minImportance: 0.2,
      },
      {
        key: "condition",
        slotId: "condition_abc",
        baseWeight: 0.82,
        questionSeekingKo: "상태는 어느 수준을 원하시나요?",
        questionListingKo: "상품 상태는 어느 정도인가요?",
      },
      {
        key: "price",
        slotId: "price",
        baseWeight: 0.7,
        questionSeekingKo: "생각하시는 가격 범위는 어느 정도인가요?",
        questionListingKo: "희망 가격은 어느 정도인가요?",
      },
    ],
  },
  furniture: {
    slug: "furniture",
    categoryId: "market.furniture",
    factors: [
      {
        key: "sizeType",
        slotId: "size_type",
        baseWeight: 0.78,
        questionSeekingKo: "원하는 종류·크기가 있나요?",
        questionListingKo: "종류·크기를 알려 주세요",
      },
      {
        key: "condition",
        slotId: "condition_abc",
        baseWeight: 0.8,
        questionSeekingKo: "상태는 어느 수준을 원하시나요?",
        questionListingKo: "가구 상태는 어느 정도인가요?",
      },
      {
        key: "price",
        slotId: "price",
        baseWeight: 0.65,
        questionSeekingKo: "생각하시는 가격 범위는 어느 정도인가요?",
        questionListingKo: "희망 가격은 어느 정도인가요?",
      },
    ],
  },
  bike: {
    slug: "bike",
    categoryId: "market.bike",
    factors: [
      {
        key: "modelYear",
        slotId: "model_year",
        baseWeight: 0.82,
        questionSeekingKo: "연식·모델은 어떤 쪽을 원하시나요?",
        questionListingKo: "연식·모델을 알려 주세요",
      },
      {
        key: "condition",
        slotId: "condition_abc",
        baseWeight: 0.78,
        questionSeekingKo: "상태는 어느 수준을 원하시나요?",
        questionListingKo: "자전거 상태는 어느 정도인가요?",
      },
      {
        key: "price",
        slotId: "price",
        baseWeight: 0.65,
        questionSeekingKo: "생각하시는 가격 범위는 어느 정도인가요?",
        questionListingKo: "희망 가격은 어느 정도인가요?",
      },
    ],
  },
  general: {
    slug: "general",
    categoryId: "market.general",
    factors: GENERAL_FACTORS,
  },
};
