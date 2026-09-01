/**
 * Osaka composite loops — end-to-end scenarios (5).
 */

import type { CompositeLoopDef } from "../types";

export const OSAKA_COMPOSITE_LOOPS: readonly CompositeLoopDef[] = [
  {
    loopId: "osaka.lodging.basic",
    goalKo: "오사카 숙소 찾기 · 기본",
    steps: [
      { capabilityId: "workspace.constraints.remember", input: { utterance: "난바역 근처" }, labelKo: "제약 기억" },
      { capabilityId: "hotel.search", labelKo: "호텔 검색" },
      { capabilityId: "hotel.rank", input: { sortBy: "value" }, labelKo: "가성비 순위" },
      { capabilityId: "workspace.entity.select", input: { entityId: "hotel-1" }, labelKo: "선택" },
    ],
  },
  {
    loopId: "osaka.lodging.quiet",
    goalKo: "조용한 숙소 · 오사카",
    steps: [
      { capabilityId: "workspace.constraints.remember", input: { utterance: "조용한 호텔 역 근처" }, labelKo: "조용·역 근처" },
      { capabilityId: "hotel.search", labelKo: "호텔 검색" },
      { capabilityId: "hotel.filter", input: { keepTopN: 5 }, labelKo: "상위 5개" },
    ],
  },
  {
    loopId: "osaka.eatery.near",
    goalKo: "숙소 근처 맛집",
    steps: [
      { capabilityId: "workspace.anchor.set", input: { utterance: "난바역" }, labelKo: "앵커 설정" },
      { capabilityId: "eatery.search", input: { utterance: "이자카야" }, labelKo: "맛집 검색" },
      { capabilityId: "graph.relation.near", input: { fromId: "anchor", toId: "eatery-1" }, labelKo: "근처 연결" },
    ],
  },
  {
    loopId: "osaka.trip.frame",
    goalKo: "오사카 3박 일정 프레임",
    steps: [
      { capabilityId: "trip.destination.resolve", input: { utterance: "오사카" }, labelKo: "목적지" },
      { capabilityId: "trip.dates.resolve", input: { utterance: "3박 4일" }, labelKo: "일정" },
      { capabilityId: "itinerary.build", input: { utterance: "오사카 3박" }, labelKo: "일정 초안" },
      { capabilityId: "workspace.inspect", labelKo: "Workspace 확인" },
    ],
  },
  {
    loopId: "osaka.lodging.prepare",
    goalKo: "숙소 검색 → 상세 → 준비",
    steps: [
      { capabilityId: "hotel.search", labelKo: "호텔 검색" },
      { capabilityId: "hotel.detail", input: { hotelId: "grand-osaka" }, labelKo: "상세" },
      { capabilityId: "workspace.reality.prepare", input: { entityId: "grand-osaka", action: "reservation_prepare" }, labelKo: "예약 준비" },
    ],
  },
];

export function getCompositeLoop(loopId: string): CompositeLoopDef | null {
  return OSAKA_COMPOSITE_LOOPS.find((loop) => loop.loopId === loopId) ?? null;
}

export function listCompositeLoops(): readonly CompositeLoopDef[] {
  return OSAKA_COMPOSITE_LOOPS;
}
