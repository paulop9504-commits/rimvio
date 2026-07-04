#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  applyEateryReactiveDiscoverySession,
  applyLodgingReactiveDiscoverySession,
  buildEateryReactiveDiscoveryRefinement,
  buildLodgingReactiveDiscoveryRefinement,
  type ReactiveDiscoveryRefinement,
} from "../lib/globe/discovery/live-discovery-reactive";
import type { GlobeEateryDiscoverySession } from "../lib/globe/eatery/project-eatery-discovery-session";
import type { GlobeLodgingDiscoverySession } from "../lib/globe/lodging/project-lodging-discovery-session";

const eaterySession: GlobeEateryDiscoverySession = {
  eventId: "ev-eatery-reactive",
  areaLabel: "오사카",
  radiusM: 1500,
  searching: false,
  userLat: 34.667,
  userLng: 135.501,
  matchedPersonName: "민지",
  signalChips: ["📍 현재 위치", "맛집 탐색"],
  items: [
    {
      resourceId: "ev-eatery-reactive:eatery:1",
      placeId: "1",
      rankIndex: 0,
      title: "난바 오코노미야키",
      shortLabel: "난바",
      providerLabel: "Google Places",
      distanceM: 140,
      priceLabel: "오코노미야키",
      score100: 96,
      detailReasonLine: "민지와 다녀간 동선 92%",
      accent: "orange",
      lat: 34.667,
      lng: 135.501,
      thumbnailUrl: null,
    },
    {
      resourceId: "ev-eatery-reactive:eatery:2",
      placeId: "2",
      rankIndex: 1,
      title: "난바 로컬 철판집",
      shortLabel: "난바",
      providerLabel: "Naver Local",
      distanceM: 220,
      priceLabel: "오코노미야키",
      score100: 91,
      detailReasonLine: "민지와 비슷한 취향 흐름",
      accent: "green",
      lat: 34.668,
      lng: 135.502,
      thumbnailUrl: null,
    },
    {
      resourceId: "ev-eatery-reactive:eatery:3",
      placeId: "3",
      rankIndex: 2,
      title: "도톤보리 우동집",
      shortLabel: "도톤보리",
      providerLabel: "Google Places",
      distanceM: 980,
      priceLabel: "우동",
      score100: 84,
      detailReasonLine: "밤 동선에 맞아요",
      accent: "blue",
      lat: 34.669,
      lng: 135.503,
      thumbnailUrl: null,
    },
  ],
};

const lodgingSession: GlobeLodgingDiscoverySession = {
  eventId: "ev-lodging-reactive",
  areaLabel: "교토",
  radiusM: 3000,
  searching: false,
  userLat: 35.011,
  userLng: 135.768,
  matchedPersonName: null,
  signalChips: ["📍 현재 위치", "숙소 탐색"],
  items: [
    {
      resourceId: "ev-lodging-reactive:lodging:1",
      placeId: "1",
      rankIndex: 0,
      title: "기온 스테이",
      shortLabel: "기온",
      distanceM: 800,
      priceKrw: 118000,
      score100: 95,
      detailReasonLine: "내 맥락 매칭 95%",
      accent: "green",
      lat: 35.011,
      lng: 135.768,
      thumbnailUrl: null,
    },
    {
      resourceId: "ev-lodging-reactive:lodging:2",
      placeId: "2",
      rankIndex: 1,
      title: "기온 가든 호텔",
      shortLabel: "기온",
      distanceM: 1500,
      priceKrw: 129000,
      score100: 90,
      detailReasonLine: "동선이 안정적이에요",
      accent: "orange",
      lat: 35.012,
      lng: 135.769,
      thumbnailUrl: null,
    },
    {
      resourceId: "ev-lodging-reactive:lodging:3",
      placeId: "3",
      rankIndex: 2,
      title: "우메다 타워 호텔",
      shortLabel: "우메다",
      distanceM: 6400,
      priceKrw: 239000,
      score100: 82,
      detailReasonLine: "조금 멀지만 여유로워요",
      accent: "purple",
      lat: 35.02,
      lng: 135.78,
      thumbnailUrl: null,
    },
  ],
};

const eateryRules = buildEateryReactiveDiscoveryRefinement({
  items: eaterySession.items,
  projectedResourceId: "ev-eatery-reactive:eatery:1",
  matchedPersonName: eaterySession.matchedPersonName,
});
assert.equal(eateryRules.relatedResourceIds[0], "ev-eatery-reactive:eatery:2");
assert.ok(eateryRules.signalChips.some((chip) => chip.includes("이어지는 후보")));

const eateryApplied = applyEateryReactiveDiscoverySession({
  session: eaterySession,
  projectedResourceId: "ev-eatery-reactive:eatery:2",
});
assert.equal(eateryApplied.items[0]?.resourceId, "ev-eatery-reactive:eatery:2");
assert.ok(eateryApplied.signalChips.some((chip) => chip.includes("난바")));

const llmRefinement: ReactiveDiscoveryRefinement = {
  relatedResourceIds: ["ev-eatery-reactive:eatery:3", "ev-eatery-reactive:eatery:2"],
  signalChips: ["밤 동선 쪽으로"],
  source: "llm",
};
const eateryWithLlm = applyEateryReactiveDiscoverySession({
  session: eaterySession,
  projectedResourceId: "ev-eatery-reactive:eatery:1",
  refinement: llmRefinement,
});
assert.equal(eateryWithLlm.items[1]?.resourceId, "ev-eatery-reactive:eatery:3");
assert.ok(eateryWithLlm.signalChips.includes("밤 동선 쪽으로"));

const lodgingRules = buildLodgingReactiveDiscoveryRefinement({
  items: lodgingSession.items,
  projectedResourceId: "ev-lodging-reactive:lodging:1",
  matchedPersonName: lodgingSession.matchedPersonName,
});
assert.equal(lodgingRules.relatedResourceIds[0], "ev-lodging-reactive:lodging:2");
assert.ok(lodgingRules.signalChips.some((chip) => chip.includes("비슷한 가격")));

const lodgingApplied = applyLodgingReactiveDiscoverySession({
  session: lodgingSession,
  projectedResourceId: "ev-lodging-reactive:lodging:2",
});
assert.equal(lodgingApplied.items[0]?.resourceId, "ev-lodging-reactive:lodging:2");

console.log("test-live-discovery-reactive: ok");
