#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { listEventCandidates, resetEventCandidatesForTests } from "../lib/events/event-store";
import {
  buildEateryPredictedExperienceCard,
  buildLodgingPredictedExperienceCard,
} from "../lib/globe/predicted-experience/build-predicted-experience-card";

resetEventCandidatesForTests([]);

const beforeWrites = listEventCandidates().length;

const lodging = buildLodgingPredictedExperienceCard({
  title: "가와라마치 스테이",
  situationalLabel: "출장 숙소",
  stayWindowLabel: "오늘 체크인 · 2박",
  stayWindow: { confidence: "confirmed", nights: 2 },
  dynamicTags: {
    chips: [
      { id: "walk_hub", label: "도보 12분" },
      { id: "taxi_hub", label: "택시 6분" },
    ],
    contextLine: "회의 끝나고 바로 쉬어 가기 좋은 흐름이에요",
  },
  recommendReason: "외근 흐름에 실용적인 숙소예요",
  recommendReasons: ["외근 흐름에 실용적인 숙소예요", "제목이 가리키는 중심 동선에 가까워요"],
  weatherPrepLine: "맑음 · 31°C",
  tempC: 31,
  priceKrw: 118000,
  partnerLabel: "Booking",
});

assert.match(lodging.summaryKo, /가능성/u);
assert.ok(lodging.supportBulletsKo.length >= 2);
assert.ok(lodging.supportBulletsKo.length <= 3);
assert.ok(lodging.signalBadges.length > 0);
assert.ok(lodging.provenance.some((row) => row.labelKo === "날씨"));
assert.equal(lodging.confidenceLabelKo, "근거 충분");

const eateryFallback = buildEateryPredictedExperienceCard({
  name: "교토 식당",
});

assert.match(eateryFallback.summaryKo, /가능성이/u);
assert.equal(eateryFallback.confidenceLabelKo, "가볍게 보는 추정");
assert.equal(eateryFallback.supportBulletsKo.length, 0);
assert.match(eateryFallback.narrativeKo, /가볍게 겹쳐 본 추정/u);

const eateryRich = buildEateryPredictedExperienceCard({
  name: "기온 라멘",
  recommendReason: "늦은 시간에 바로 들어가기 쉬워요",
  recommendReasons: ["늦은 시간에 바로 들어가기 쉬워요", "제목의 야식 흐름에 맞아요"],
  relationSummary: {
    anchorResourceId: "ev-1:lodging:stay",
    anchorName: "가와라마치 스테이",
    distanceKm: 0.6,
    badgeLabelKo: "도보 8분",
    summaryKo: "도보 8분이라 체크인 뒤에 바로 이어 가기 좋아요",
    stayWindowLabelKo: "오늘 체크인 · 2박",
    stayPhase: "check_in_day",
  },
  cuisineHint: "라멘",
  rating: 4.6,
  openNow: true,
  priceLevel: 2,
  providerLabel: "Google Places",
  categoryLabel: "야식",
  weatherPrepLine: "맑음 · 28°C",
});

assert.match(eateryRich.summaryKo, /가와라마치 스테이/u);
assert.ok(eateryRich.provenance.some((row) => row.labelKo === "평점"));
assert.ok(eateryRich.signalBadges.some((row) => row.labelKo === "영업 중"));

assert.equal(
  listEventCandidates().length,
  beforeWrites,
  "predicted experience builders must not write truth events",
);

console.log("test-predicted-experience-card: ok");
