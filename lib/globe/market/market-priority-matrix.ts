/**
 * Market v1.2 — category priority matrix (code SSOT).
 */

import type { MarketCategoryId } from "@/lib/globe/market/market-intent-types";

export const MARKET_PRIORITY_SCHEMA_VERSION = "market.v1.2" as const;

export type MarketPrioritySlotId =
  | "price"
  | "storage_gb"
  | "battery_health"
  | "cosmetic_grade"
  | "repair_history"
  | "color_design"
  | "condition_abc"
  | "model_year"
  | "distance"
  | "size_type"
  | "working_state";

export type MarketPrioritySlotKind =
  | "price_man"
  | "storage_gb"
  | "percent"
  | "grade_abc"
  | "grade_cosmetic"
  | "boolean_none"
  | "text"
  | "year";

export type MarketPrioritySlotDef = {
  field: MarketPrioritySlotId;
  weight: number;
  required: boolean;
  kind: MarketPrioritySlotKind;
  autoFill?: "text" | "image" | "gps" | "memory";
};

export type CategoryPriorityMatrix = {
  categoryId: MarketCategoryId;
  schemaVersion: typeof MARKET_PRIORITY_SCHEMA_VERSION;
  prioritySlots: readonly MarketPrioritySlotDef[];
  matchThreshold: number;
  sellerGuideKo: string;
  seekerGuideKo: string;
};

const PHONE_MATRIX: CategoryPriorityMatrix = {
  categoryId: "market.phone",
  schemaVersion: MARKET_PRIORITY_SCHEMA_VERSION,
  matchThreshold: 0.72,
  sellerGuideKo: "배터리·용량·가격·외관 순으로 맞춰 주세요.",
  seekerGuideKo: "배터리·용량·가격·외관이 맞는 흔적을 찾을게요.",
  prioritySlots: [
    { field: "battery_health", weight: 0.25, required: true, kind: "percent", autoFill: "text" },
    { field: "storage_gb", weight: 0.25, required: true, kind: "storage_gb", autoFill: "text" },
    { field: "price", weight: 0.3, required: true, kind: "price_man", autoFill: "text" },
    { field: "cosmetic_grade", weight: 0.2, required: true, kind: "grade_cosmetic", autoFill: "text" },
    { field: "repair_history", weight: 0, required: false, kind: "boolean_none", autoFill: "text" },
  ],
};

const FASHION_MATRIX: CategoryPriorityMatrix = {
  categoryId: "market.fashion",
  schemaVersion: MARKET_PRIORITY_SCHEMA_VERSION,
  matchThreshold: 0.72,
  sellerGuideKo: "패션은 색상·디자인과 상태를 먼저 적어 주세요.",
  seekerGuideKo: "원하는 색상·디자인과 상태에 맞는 흔적을 찾을게요.",
  prioritySlots: [
    { field: "color_design", weight: 0.4, required: true, kind: "text", autoFill: "text" },
    { field: "condition_abc", weight: 0.35, required: true, kind: "grade_abc", autoFill: "text" },
    { field: "price", weight: 0.25, required: true, kind: "price_man", autoFill: "text" },
  ],
};

const BIKE_MATRIX: CategoryPriorityMatrix = {
  categoryId: "market.bike",
  schemaVersion: MARKET_PRIORITY_SCHEMA_VERSION,
  matchThreshold: 0.72,
  sellerGuideKo: "자전거는 연식·모델과 상태, 직거래 거리가 중요해요.",
  seekerGuideKo: "연식·상태와 가까운 직거래 흔적을 우선 볼게요.",
  prioritySlots: [
    { field: "model_year", weight: 0.35, required: true, kind: "year", autoFill: "text" },
    { field: "condition_abc", weight: 0.3, required: true, kind: "grade_abc", autoFill: "text" },
    { field: "price", weight: 0.2, required: true, kind: "price_man", autoFill: "text" },
    { field: "distance", weight: 0.15, required: true, kind: "text", autoFill: "gps" },
  ],
};

const FURNITURE_MATRIX: CategoryPriorityMatrix = {
  categoryId: "market.furniture",
  schemaVersion: MARKET_PRIORITY_SCHEMA_VERSION,
  matchThreshold: 0.72,
  sellerGuideKo: "가구는 종류·크기와 상태를 먼저 적어 주세요.",
  seekerGuideKo: "크기·상태와 가격이 맞는 흔적을 찾을게요.",
  prioritySlots: [
    { field: "size_type", weight: 0.3, required: true, kind: "text", autoFill: "text" },
    { field: "condition_abc", weight: 0.35, required: true, kind: "grade_abc", autoFill: "text" },
    { field: "price", weight: 0.2, required: true, kind: "price_man", autoFill: "text" },
    { field: "distance", weight: 0.15, required: true, kind: "text", autoFill: "gps" },
  ],
};

const GENERAL_MATRIX: CategoryPriorityMatrix = {
  categoryId: "market.general",
  schemaVersion: MARKET_PRIORITY_SCHEMA_VERSION,
  matchThreshold: 0.72,
  sellerGuideKo: "가격·상태·근처 거리 순으로 맞춰 주세요.",
  seekerGuideKo: "가격·상태·거리가 맞는 흔적을 찾을게요.",
  prioritySlots: [
    { field: "price", weight: 0.45, required: true, kind: "price_man", autoFill: "text" },
    { field: "condition_abc", weight: 0.35, required: true, kind: "grade_abc", autoFill: "text" },
    { field: "distance", weight: 0.2, required: true, kind: "text", autoFill: "gps" },
  ],
};

const CONTEXT_MATRIX: CategoryPriorityMatrix = {
  categoryId: "market.camera",
  schemaVersion: MARKET_PRIORITY_SCHEMA_VERSION,
  matchThreshold: 0.72,
  sellerGuideKo: "가격·작동 상태·맥락 사진을 함께 맞춰 주세요.",
  seekerGuideKo: "가격·상태·맥락이 맞는 흔적을 찾을게요.",
  prioritySlots: [
    { field: "price", weight: 0.4, required: true, kind: "price_man", autoFill: "text" },
    { field: "working_state", weight: 0.3, required: true, kind: "text", autoFill: "text" },
    { field: "condition_abc", weight: 0.2, required: true, kind: "grade_abc", autoFill: "text" },
    { field: "distance", weight: 0.1, required: true, kind: "text", autoFill: "gps" },
  ],
};

const MATRIX_BY_CATEGORY: Record<MarketCategoryId, CategoryPriorityMatrix> = {
  "market.phone": PHONE_MATRIX,
  "market.fashion": FASHION_MATRIX,
  "market.bike": BIKE_MATRIX,
  "market.furniture": FURNITURE_MATRIX,
  "market.general": GENERAL_MATRIX,
  "market.camera": { ...CONTEXT_MATRIX, categoryId: "market.camera" },
  "market.camping": {
    ...CONTEXT_MATRIX,
    categoryId: "market.camping",
    sellerGuideKo: "가격·사용 횟수·맥락을 함께 맞춰 주세요.",
    seekerGuideKo: "캠핑 맥락·상태·가격이 맞는 흔적을 찾을게요.",
  },
  "market.instrument": {
    ...CONTEXT_MATRIX,
    categoryId: "market.instrument",
    sellerGuideKo: "가격·보관·연주 맥락을 함께 맞춰 주세요.",
    seekerGuideKo: "연주 맥락·상태·가격이 맞는 흔적을 찾을게요.",
  },
  "market.outdoor": {
    ...CONTEXT_MATRIX,
    categoryId: "market.outdoor",
    sellerGuideKo: "가격·안전 상태·산행 맥락을 함께 맞춰 주세요.",
    seekerGuideKo: "등산 맥락·상태·가격이 맞는 흔적을 찾을게요.",
  },
};

export function getCategoryPriorityMatrix(
  categoryId: MarketCategoryId,
): CategoryPriorityMatrix {
  return MATRIX_BY_CATEGORY[categoryId] ?? GENERAL_MATRIX;
}

export function getTopPrioritySlots(
  categoryId: MarketCategoryId,
  limit = 3,
): readonly MarketPrioritySlotDef[] {
  const matrix = getCategoryPriorityMatrix(categoryId);
  return matrix.prioritySlots
    .filter((slot) => slot.required && slot.weight > 0)
    .slice(0, limit);
}

export function getWeightedPrioritySlots(
  categoryId: MarketCategoryId,
): readonly MarketPrioritySlotDef[] {
  return getCategoryPriorityMatrix(categoryId).prioritySlots.filter(
    (slot) => slot.weight > 0,
  );
}

export function marketPrioritySlotLabelKo(field: MarketPrioritySlotId): string {
  switch (field) {
    case "price":
      return "가격";
    case "storage_gb":
      return "저장 용량";
    case "battery_health":
      return "배터리 효율";
    case "cosmetic_grade":
      return "외관 상태";
    case "repair_history":
      return "수리 이력 없음";
    case "color_design":
      return "색상·디자인";
    case "condition_abc":
      return "상태";
    case "model_year":
      return "연식·모델";
    case "distance":
      return "직거래 거리";
    case "size_type":
      return "종류·크기";
    case "working_state":
      return "작동 상태";
    default:
      return field;
  }
}

export function marketPrioritySlotPlaceholderKo(
  field: MarketPrioritySlotId,
  role: "listing" | "seeking",
): string {
  switch (field) {
    case "price":
      return role === "seeking" ? "예: 70" : "예: 80";
    case "battery_health":
      return "예: 85";
    case "storage_gb":
      return role === "seeking" ? "예: 256GB 이상" : "예: 256GB";
    case "cosmetic_grade":
      return "미개봉 / 거의 새것 / 사용감 적음";
    case "color_design":
      return "예: 블랙 · 미니멀";
    case "condition_abc":
      return "A / B / C";
    case "model_year":
      return "예: 2022 · 로드 M";
    case "size_type":
      return "예: 2인 소파 · 180cm";
    case "distance":
      return "근처 직거래";
    case "working_state":
      return "예: 정상 작동 · 셔터 양호";
    default:
      return "";
  }
}
