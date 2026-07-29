/**
 * Kind recipes — plug content into the six-region SDK.
 * morphologyId is auto from Context Type (ADR-033) — never a user picker.
 */

import type { WorkspaceSdkKind, WorkspaceSdkKindRecipe } from "@/lib/workspace-sdk/types";

export const TRAVEL_SDK_RECIPE: WorkspaceSdkKindRecipe = {
  kind: "travel",
  morphologyId: "spatial_timeline",
  defaultHeaderTitleKo: "여행 작업장",
  aiRoleLabelKo: "작업 파트너",
  aiPromptPlaceholderKo: "같이 맞춰 볼까요?",
  focusSlotId: "flight",
  focusLabelKo: "항공",
  node: { surface: "map", labelKo: "지도 · 일정" },
  action: {
    id: "reserve_prep",
    labelKo: "예약 준비",
    toolId: "booking.prepare",
  },
  commit: {
    labelKo: "결제 · 반영",
    requiresHuman: true,
    leadsToPayment: true,
  },
};

export const DRIVER_SDK_RECIPE: WorkspaceSdkKindRecipe = {
  kind: "driver",
  morphologyId: "vehicle_dashboard",
  defaultHeaderTitleKo: "대리 작업장",
  aiRoleLabelKo: "대리 도우미",
  aiPromptPlaceholderKo: "수요·동선 물어보세요",
  focusSlotId: "demand_hot",
  focusLabelKo: "수요 지역",
  node: { surface: "dashboard", labelKo: "호출 밀도 · 동선" },
  action: {
    id: "navigate_hot",
    labelKo: "그쪽으로 길찾기",
    toolId: "maps.navigate",
  },
  commit: {
    labelKo: "오늘 목표 확정",
    requiresHuman: true,
    leadsToPayment: false,
  },
};

/** Marketplace / used goods — Card + Pipeline (ADR-032 · ADR-033). */
export const USED_GOODS_SDK_RECIPE: WorkspaceSdkKindRecipe = {
  kind: "used_goods",
  morphologyId: "card_pipeline",
  defaultHeaderTitleKo: "거래 작업장",
  aiRoleLabelKo: "작업 파트너",
  aiPromptPlaceholderKo: "조건·가격 같이 맞춰 볼까요?",
  focusSlotId: "photos",
  focusLabelKo: "사진",
  node: { surface: "pipeline", labelKo: "거래 파이프라인" },
  action: {
    id: "peer_chat",
    labelKo: "채팅",
    toolId: null,
  },
  commit: {
    labelKo: "거래 확정",
    requiresHuman: true,
    leadsToPayment: true,
  },
};

const BY_KIND: Readonly<Record<WorkspaceSdkKind, WorkspaceSdkKindRecipe>> = {
  travel: TRAVEL_SDK_RECIPE,
  driver: DRIVER_SDK_RECIPE,
  used_goods: USED_GOODS_SDK_RECIPE,
};

export function workspaceSdkRecipe(
  kind: WorkspaceSdkKind,
): WorkspaceSdkKindRecipe {
  return BY_KIND[kind];
}

export function listWorkspaceSdkRecipes(): readonly WorkspaceSdkKindRecipe[] {
  return [TRAVEL_SDK_RECIPE, DRIVER_SDK_RECIPE, USED_GOODS_SDK_RECIPE];
}
