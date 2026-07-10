import assert from "node:assert/strict";
import type { ContextLodgingInventoryRow } from "../lib/globe/context-hub/lodging-resource-types";
import type { EventCandidate } from "../lib/events/event-candidate";
import { scoreBusinessTripLodgingBias } from "../lib/globe/lodging/score-business-trip-lodging-bias";
import { scoreLodgingRecommendations } from "../lib/globe/lodging/score-lodging-recommendations";
import type { UnifiedExperienceContext } from "../lib/experience-context/unified-experience-context-types";

const businessEvent = {
  id: "evt-biz",
  title: "부산 출장",
  place: "부산",
  description: "미팅 출장",
  datetime: "2026-07-10T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

const rows: ContextLodgingInventoryRow[] = [
  {
    placeId: "lodging-station",
    name: "서면역 비즈니스 호텔",
    lat: 35.158,
    lng: 129.059,
    priceKrw: 120_000,
    partnerLabel: "LiteAPI",
    address: "부산 부산진구",
    mapsUrl: null,
    checkInIso: null,
    checkOutIso: null,
    stayWindow: null,
    images: [],
    provider: "liteapi",
  },
  {
    placeId: "lodging-resort",
    name: "해운대 오션 리조트",
    lat: 35.163,
    lng: 129.164,
    priceKrw: 110_000,
    partnerLabel: "LiteAPI",
    address: "부산 해운대구",
    mapsUrl: null,
    checkInIso: null,
    checkOutIso: null,
    stayWindow: null,
    images: [],
    provider: "liteapi",
  },
];

const stationBias = scoreBusinessTripLodgingBias({
  row: rows[0]!,
  event: businessEvent,
  povLat: 35.1579,
  povLng: 129.059,
});
assert.ok(stationBias.delta > 0);

const unifiedContext = {
  personExperienceSlice: [],
  behaviorKernel: {
    state: { trajectory: { dominant_cluster: "travel", strength: 0.2 } },
  },
} as unknown as UnifiedExperienceContext;

const scored = scoreLodgingRecommendations({
  rows,
  unifiedContext,
  lat: 35.1579,
  lng: 129.059,
  event: businessEvent,
});
assert.equal(scored[0]?.row.placeId, "lodging-station");

console.log("test-business-lodging-rank: ok");
