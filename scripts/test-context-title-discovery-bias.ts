#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import type { UnifiedExperienceContext } from "@/lib/experience-context/unified-experience-context-types";
import { upsertEventCandidate } from "@/lib/events/event-store";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";
import { scoreEateryRecommendations } from "@/lib/globe/eatery/score-eatery-recommendations";
import { scoreLodgingRecommendations } from "@/lib/globe/lodging/score-lodging-recommendations";

function buildUnifiedStub(message: string): UnifiedExperienceContext {
  return {
    message,
    behaviorKernel: {
      state: {
        trajectory: {
          dominant_cluster: "none",
          strength: 0,
        },
      },
    },
    personExperienceSlice: [],
  } as unknown as UnifiedExperienceContext;
}

const stamp = "2026-07-04T12:00:00.000Z";
const osaka = { lat: 34.6937, lng: 135.5023 };

const lateNightEvent = upsertEventCandidate({
  id: "title-bias-late-night",
  title: "첫날 야식",
  category: "food",
  source: "manual",
  lifecycle: "planned",
  datetime: "2026-07-11T22:30:00.000+09:00",
  place: "오사카",
  description: "",
  confidence: 0.9,
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
});

const lateNightContext = buildContextInstance({
  event: lateNightEvent,
  lat: osaka.lat,
  lng: osaka.lng,
  preferUserLocation: true,
});

const eateryRows: ContextEateryInventoryRow[] = [
  {
    placeId: "eatery-24h",
    name: "오사카역 24시 우동",
    lat: osaka.lat,
    lng: osaka.lng,
    images: [],
    address: "오사카역 앞",
    cuisineHint: "우동",
    priceLevel: 1,
    rating: 4.1,
    openNow: true,
    mapsUrl: null,
    provider: "mock",
    providerLabel: "mock",
    categoryLabel: "음식점>우동",
    specialReasonKo: null,
    specialScore: 0,
    searchScore: 0,
  },
  {
    placeId: "eatery-brunch",
    name: "오사카 브런치 카페",
    lat: osaka.lat + 0.01,
    lng: osaka.lng + 0.01,
    images: [],
    address: "오사카 중심",
    cuisineHint: "브런치",
    priceLevel: 2,
    rating: 4.6,
    openNow: false,
    mapsUrl: null,
    provider: "mock",
    providerLabel: "mock",
    categoryLabel: "카페",
    specialReasonKo: null,
    specialScore: 0,
    searchScore: 0,
  },
];

const eateryScored = scoreEateryRecommendations({
  rows: eateryRows,
  unifiedContext: buildUnifiedStub("야식 뭐 먹지"),
  lat: osaka.lat,
  lng: osaka.lng,
  context: lateNightContext,
});

assert.equal(eateryScored[0]?.row.placeId, "eatery-24h");
assert.match(eateryScored[0]?.reasonKo ?? "", /야식|동선/u);

const familyEvent = upsertEventCandidate({
  id: "title-bias-family-lodging",
  title: "엄마랑 오사카",
  category: "custom",
  source: "manual",
  lifecycle: "planned",
  datetime: "2026-07-15T15:00:00.000+09:00",
  description: "",
  confidence: 0.9,
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
});

const familyContext = buildContextInstance({
  event: familyEvent,
  lat: osaka.lat,
  lng: osaka.lng,
  preferUserLocation: true,
});

const lodgingRows: ContextLodgingInventoryRow[] = [
  {
    placeId: "lodging-family",
    name: "난바 패밀리 스위트",
    lat: osaka.lat,
    lng: osaka.lng,
    images: [],
    priceKrw: 160_000,
    partnerLabel: "family suite",
    address: "난바 역 앞",
    mapsUrl: null,
    provider: "mock",
  },
  {
    placeId: "lodging-capsule",
    name: "난바 비즈니스 캡슐",
    lat: osaka.lat,
    lng: osaka.lng,
    images: [],
    priceKrw: 85_000,
    partnerLabel: "business capsule",
    address: "난바 역 앞",
    mapsUrl: null,
    provider: "mock",
  },
];

const lodgingScored = scoreLodgingRecommendations({
  rows: lodgingRows,
  unifiedContext: buildUnifiedStub("숙소 찾아줘"),
  lat: osaka.lat,
  lng: osaka.lng,
  context: familyContext,
});

assert.equal(familyContext.title.primaryPlaceHint?.label, "오사카");
assert.equal(lodgingScored[0]?.row.placeId, "lodging-family");
assert.match(lodgingScored[0]?.reasonKo ?? "", /가족|편한/u);

console.log("test-context-title-discovery-bias: ok");
