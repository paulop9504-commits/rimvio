/**
 * Fixed Workspace templates — Travel + Driver + Used goods.
 * Slots are SSOT; Focus sequence = One Focus order (ADR-025).
 * Marketplace is a Context type, not a separate app (ADR-032).
 */

import type { WorkspaceKind, WorkspaceKindTemplate } from "@/lib/workspace-kind/types";

export const TRAVEL_WORKSPACE_TEMPLATE: WorkspaceKindTemplate = {
  kind: "travel",
  titleKo: "여행 작업장",
  eyebrowKo: "자원 준비됨",
  slots: [
    { id: "flight", labelKo: "항공", filler: "tool", required: false },
    { id: "hotel", labelKo: "숙소", filler: "tool", required: true },
    { id: "itinerary", labelKo: "일정", filler: "tool", required: true },
    { id: "map", labelKo: "지도", filler: "tool", required: true },
    { id: "budget", labelKo: "예산", filler: "user", required: false },
    { id: "eatery", labelKo: "맛집", filler: "tool", required: false },
    { id: "transit", labelKo: "교통", filler: "tool", required: false },
    { id: "booking", labelKo: "예약", filler: "tool", required: false },
    { id: "fx", labelKo: "환율", filler: "stub", required: false },
    { id: "weather", labelKo: "날씨", filler: "stub", required: false },
    { id: "checklist", labelKo: "체크리스트", filler: "user", required: false },
  ],
  // One Focus order — not “open all slots”.
  focusSequence: ["flight", "hotel", "itinerary"],
  toolPack: [
    "hotel.lookup",
    "restaurant.lookup",
    "maps.search",
    "maps.navigate",
    "ranking.pick",
    "booking.prepare",
    "calendar.add",
  ],
};

export const DRIVER_WORKSPACE_TEMPLATE: WorkspaceKindTemplate = {
  kind: "driver",
  titleKo: "대리 작업장",
  eyebrowKo: "자원 준비됨",
  slots: [
    { id: "here", labelKo: "현재 위치", filler: "sensor", required: true },
    { id: "demand_hot", labelKo: "수요 높은 지역", filler: "stub", required: true },
    { id: "earn_hour", labelKo: "예상 시간당 수익", filler: "stub", required: false },
    { id: "call_density", labelKo: "실시간 호출 밀도", filler: "stub", required: true },
    { id: "weather", labelKo: "날씨", filler: "stub", required: false },
    { id: "home_route", labelKo: "귀가 동선", filler: "tool", required: false },
    { id: "rest", labelKo: "쉬기 좋은 장소", filler: "tool", required: false },
    { id: "cafe_24h", labelKo: "24시간 카페", filler: "tool", required: false },
    { id: "parking", labelKo: "주차장", filler: "tool", required: false },
    { id: "goal_earn", labelKo: "오늘 목표 수익", filler: "user", required: false },
  ],
  focusSequence: ["here", "demand_hot", "home_route"],
  toolPack: ["maps.search", "maps.navigate", "pharmacy.lookup", "calendar.add"],
};

/** Sell default Focus — buy overrides sequence at continuum time. */
export const USED_GOODS_WORKSPACE_TEMPLATE: WorkspaceKindTemplate = {
  kind: "used_goods",
  titleKo: "거래 작업장",
  eyebrowKo: "자원 준비됨",
  slots: [
    { id: "photos", labelKo: "사진", filler: "user", required: true },
    { id: "product", labelKo: "상품 정보", filler: "stub", required: true },
    { id: "price", labelKo: "가격", filler: "stub", required: true },
    { id: "location", labelKo: "거래 위치", filler: "sensor", required: true },
    { id: "match", labelKo: "구매자 매칭", filler: "stub", required: false },
    { id: "conditions", labelKo: "구매 조건", filler: "user", required: true },
    { id: "sellers", labelKo: "판매자", filler: "stub", required: true },
    { id: "chat", labelKo: "채팅", filler: "user", required: false },
    { id: "status", labelKo: "거래 상태", filler: "stub", required: false },
  ],
  focusSequence: ["photos", "product", "price", "location", "match"],
  toolPack: ["maps.search", "maps.navigate"],
};

/** Buy Focus order — conditions → price band → seller candidates. */
export const USED_GOODS_BUY_FOCUS_SEQUENCE = [
  "conditions",
  "price",
  "sellers",
] as const;

export const USED_GOODS_SELL_FOCUS_SEQUENCE = [
  "photos",
  "product",
  "price",
  "location",
  "match",
] as const;

const BY_KIND: Readonly<Record<WorkspaceKind, WorkspaceKindTemplate>> = {
  travel: TRAVEL_WORKSPACE_TEMPLATE,
  driver: DRIVER_WORKSPACE_TEMPLATE,
  used_goods: USED_GOODS_WORKSPACE_TEMPLATE,
};

export function workspaceKindTemplate(
  kind: WorkspaceKind,
): WorkspaceKindTemplate {
  return BY_KIND[kind];
}

export function usedGoodsFocusSequence(
  role: "sell" | "buy",
): readonly string[] {
  return role === "buy"
    ? USED_GOODS_BUY_FOCUS_SEQUENCE
    : USED_GOODS_SELL_FOCUS_SEQUENCE;
}

export function listWorkspaceKindTemplates(): readonly WorkspaceKindTemplate[] {
  return [
    TRAVEL_WORKSPACE_TEMPLATE,
    DRIVER_WORKSPACE_TEMPLATE,
    USED_GOODS_WORKSPACE_TEMPLATE,
  ];
}
