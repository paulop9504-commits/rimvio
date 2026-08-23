/**
 * Transit crowding SSOT — station congestion index (Tier C).
 * Live ingest replaces this slice; Fact Query stays deterministic-first.
 */

export type TransitCrowdingLevel = 1 | 2 | 3 | 4 | 5;

export type TransitCrowdingRecord = {
  readonly cityId: string;
  readonly stationId: string;
  readonly level: TransitCrowdingLevel;
  readonly labelKo: string;
  readonly detailKo: string;
  readonly sourceKo: string;
};

export const TRANSIT_CROWDING_SSOT: readonly TransitCrowdingRecord[] = [
  {
    cityId: "seoul",
    stationId: "gangnam",
    level: 5,
    labelKo: "매우 혼잡",
    detailKo: "출퇴근 피크 · 2호선 승하차 혼잡",
    sourceKo: "Seoul Metro crowding slice",
  },
  {
    cityId: "seoul",
    stationId: "hongdae",
    level: 4,
    labelKo: "혼잡",
    detailKo: "주말·저녁 유동 많음 · 2호선",
    sourceKo: "Seoul Metro crowding slice",
  },
  {
    cityId: "seoul",
    stationId: "sadang",
    level: 4,
    labelKo: "혼잡",
    detailKo: "2·3·4호선 환승 혼잡",
    sourceKo: "Seoul Metro crowding slice",
  },
  {
    cityId: "seoul",
    stationId: "myeongdong",
    level: 4,
    labelKo: "혼잡",
    detailKo: "관광·쇼핑 유동 · 4호선",
    sourceKo: "Seoul Metro crowding slice",
  },
  {
    cityId: "seoul",
    stationId: "gwanghwamun",
    level: 3,
    labelKo: "보통",
    detailKo: "관광·출근 혼재 · 5호선",
    sourceKo: "Seoul Metro crowding slice",
  },
  {
    cityId: "tokyo",
    stationId: "shibuya",
    level: 5,
    labelKo: "매우 혼잡",
    detailKo: "환승·상업 허브 · 긴자·후쿠토신",
    sourceKo: "Tokyo Metro crowding slice",
  },
  {
    cityId: "tokyo",
    stationId: "shinjuku",
    level: 5,
    labelKo: "매우 혼잡",
    detailKo: "세계 최대급 환승 · 마루노우치",
    sourceKo: "Tokyo Metro crowding slice",
  },
  {
    cityId: "osaka",
    stationId: "namba",
    level: 4,
    labelKo: "혼잡",
    detailKo: "미도스지·난카이 환승 · 쇼핑 유동",
    sourceKo: "Osaka Metro crowding slice",
  },
  {
    cityId: "osaka",
    stationId: "umeda",
    level: 4,
    labelKo: "혼잡",
    detailKo: "JR·한큐·미도스지 환승",
    sourceKo: "Osaka Metro crowding slice",
  },
];

export function lookupTransitCrowding(input: {
  readonly cityId: string;
  readonly stationId: string;
}): TransitCrowdingRecord | null {
  return (
    TRANSIT_CROWDING_SSOT.find(
      (row) =>
        row.cityId === input.cityId && row.stationId === input.stationId,
    ) ?? null
  );
}
