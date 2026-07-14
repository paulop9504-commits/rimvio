#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { UnifiedExperienceContext } from "../lib/experience-context/unified-experience-context-types";
import type { ContextEateryInventoryRow } from "../lib/globe/eatery/eatery-resource-types";
import { resolveEateryRankProfile } from "../lib/globe/eatery/eatery-rank-profile";
import { scoreEateryRecommendations } from "../lib/globe/eatery/score-eatery-recommendations";

const unified = {
  message: "",
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

const rows: ContextEateryInventoryRow[] = [
  {
    placeId: "a",
    name: "유명 관광 맛집",
    lat: 34.69,
    lng: 135.5,
    images: [],
    cuisineHint: "라멘",
    priceLevel: 3,
    rating: 4.7,
    categoryLabel: "인기·관광",
    specialReasonKo: null,
    specialScore: 0,
    searchScore: 0,
  },
  {
    placeId: "b",
    name: "골목 로컬 식당",
    lat: 34.691,
    lng: 135.501,
    images: [],
    cuisineHint: "가정식",
    priceLevel: 1,
    rating: 4.2,
    categoryLabel: "로컬·현지·골목",
    specialReasonKo: "현지인이 가는 자리",
    specialScore: 12,
    searchScore: 0,
  },
];

const localProfile = resolveEateryRankProfile({
  mode: "auto",
  hints: { foodBias: "local" },
});
const popularProfile = resolveEateryRankProfile({ mode: "popular" });

const localScored = scoreEateryRecommendations({
  rows,
  unifiedContext: unified,
  lat: 34.69,
  lng: 135.5,
  rankProfile: localProfile,
});
const popularScored = scoreEateryRecommendations({
  rows,
  unifiedContext: unified,
  lat: 34.69,
  lng: 135.5,
  rankProfile: popularProfile,
});

assert.equal(localScored[0]?.row.placeId, "b");
assert.equal(popularScored[0]?.row.placeId, "a");

console.log("test-eatery-rank-reorder-smoke: ok");
