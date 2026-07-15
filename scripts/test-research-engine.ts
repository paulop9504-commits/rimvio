#!/usr/bin/env npx tsx
/**
 * Research Engine — 5-axis 납득도 (review · price · distance · context · cross).
 */

import assert from "node:assert/strict";
import { RESEARCH_STAGES } from "../engines/research/schema";
import type { FastScanCandidate } from "../engines/research/schema";
import {
  createFixtureCandidateProvider,
  isResearchUtterance,
  runResearchEngine,
  scoreResearchPersuasion,
} from "../lib/research-engine";
import type { RankedCandidate } from "../engines/research/schema";

assert.equal(isResearchUtterance("도쿄 게스트하우스 어디가 좋아?"), true);
assert.equal(isResearchUtterance("주변 호텔 찾아줘"), false);

const inventoryStrong: FastScanCandidate[] = [
  {
    id: "h1",
    title: "Shinjuku Capsule 98k",
    snippet: "신주쿠역 가성비 호텔. 위치가 좋고 체크인 편리.",
    domain: "inventory.lodging.rimvio",
    reviewCount: 210,
    popularity: 0.86,
    mediaType: "listing",
    language: "ko",
    metadata: {
      priceKrw: 98_000,
      lat: 35.6909,
      lng: 139.7003,
    },
  },
  {
    id: "h2",
    title: "Quiet Stay Farther",
    snippet: "조용한 숙소. 가격 11만원대.",
    domain: "discovery.lodging.rimvio",
    reviewCount: 40,
    popularity: 0.7,
    mediaType: "listing",
    language: "ko",
    metadata: {
      priceKrw: 110_000,
      lat: 35.71,
      lng: 139.73,
    },
  },
];

const weak: FastScanCandidate[] = [
  {
    id: "w1",
    title: "Only One",
    snippet: "짧음",
    domain: "solo.test",
    mediaType: "unknown",
    reviewCount: 0,
    popularity: 0.1,
  },
];

const agree: FastScanCandidate[] = [
  {
    id: "a1",
    title: "Koenji Guest House",
    snippet: "가성비 좋다는 후기. 위치 편리. 가격 28,000원대.",
    domain: "reviews.alpha.test",
    reviewCount: 240,
    popularity: 0.8,
    mediaType: "review",
    language: "ko",
    publishDateIso: new Date().toISOString(),
    metadata: { priceKrw: 28_000, lat: 35.705, lng: 139.65 },
  },
  {
    id: "b1",
    title: "Quiet Stay Shinjuku",
    snippet: "조용하고 청결. 가격 31,000원 수준. 추천 많음.",
    domain: "listings.beta.test",
    reviewCount: 90,
    popularity: 0.65,
    mediaType: "listing",
    language: "ko",
    metadata: { priceKrw: 31_000, lat: 35.69, lng: 139.7 },
  },
  {
    id: "c1",
    title: "Shinjuku Backpackers",
    snippet: "공식 안내 위치·시설 요약. 후기에서 위치 좋다고 함.",
    domain: "official.gamma.test",
    reviewCount: 40,
    popularity: 0.55,
    mediaType: "official",
    language: "ko",
    metadata: { priceKrw: 29_500, lat: 35.691, lng: 139.701 },
  },
];

async function main() {
  const result = await runResearchEngine({
    text: "하루 10만원대 호텔 어디가 좋아?",
    provider: createFixtureCandidateProvider(inventoryStrong),
    anchorLat: 35.6895,
    anchorLng: 139.6917,
    maxNightlyPriceKrw: 100_000,
  });
  assert.deepEqual([...result.stageTrace], [...RESEARCH_STAGES]);
  assert.ok(
    result.confidence >= 0.55,
    `expected high 납득도 from real axes, got ${result.confidence}`,
  );
  assert.equal(result.decision.evidenceWeak, false);
  assert.match(result.decision.best.summaryKo, /리뷰|★|1박|도보|km/);
  assert.ok(!/증거가 약합니다/.test(result.decision.whyKo));

  const compose = (
    await import("../lib/research-engine/run-research-engine")
  ).formatResearchResultComposeKo(result);
  assert.match(compose, /납득도 \d+/);
  assert.ok(!/신뢰도 26/.test(compose));

  const ranked: RankedCandidate[] = result.ranked;
  const persuasion = scoreResearchPersuasion(ranked, {
    message: "하루 10만원대 호텔 어디가 좋아?",
    maxNightlyPriceKrw: 100_000,
    anchorLat: 35.6895,
    anchorLng: 139.6917,
  });
  assert.ok(persuasion.axes.filter((a) => a.available).length >= 3);
  assert.ok(persuasion.headlineKo.length > 8);

  const agreeResult = await runResearchEngine({
    text: "게스트하우스 어디가 좋아?",
    provider: createFixtureCandidateProvider(agree),
    anchorLat: 35.69,
    anchorLng: 139.7,
  });
  assert.ok(agreeResult.confidence >= 0.45);

  const weakResult = await runResearchEngine({
    text: "뭐가 나아?",
    provider: createFixtureCandidateProvider(weak),
  });
  assert.equal(weakResult.decision.evidenceWeak, true);
  assert.ok(weakResult.confidence < 0.5);

  // Different places different prices ≠ conflict
  const diffPrices = await runResearchEngine({
    text: "어디가 좋아?",
    provider: createFixtureCandidateProvider(inventoryStrong),
  });
  assert.equal(diffPrices.evidence.conflictingFacts.length, 0);

  console.log(
    `✓ 5-axis 납득도 — conf=${(result.confidence * 100).toFixed(0)} headline=${persuasion.headlineKo}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
