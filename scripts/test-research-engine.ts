#!/usr/bin/env npx tsx
/**
 * Research Engine v1 — 10 stages, multi-source confidence, weak evidence.
 */

import assert from "node:assert/strict";
import { RESEARCH_STAGES } from "../engines/research/schema";
import type { FastScanCandidate } from "../engines/research/schema";
import {
  createFixtureCandidateProvider,
  isResearchUtterance,
  runResearchEngine,
} from "../lib/research-engine";

assert.equal(isResearchUtterance("도쿄 게스트하우스 어디가 좋아?"), true);
assert.equal(isResearchUtterance("주변 호텔 찾아줘"), false);

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
    metadata: { priceKrw: 28_000 },
  },
  {
    id: "a2",
    title: "Koenji Guest House",
    snippet: "중복 타이틀 — 제거되어야 함",
    domain: "spam.clone.test",
    reviewCount: 2,
    popularity: 0.2,
    mediaType: "listing",
    language: "ko",
    metadata: { priceKrw: 28_000 },
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
    publishDateIso: new Date().toISOString(),
    metadata: { priceKrw: 31_000 },
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
    publishDateIso: new Date().toISOString(),
    metadata: { priceKrw: 29_500 },
  },
];

const conflict: FastScanCandidate[] = [
  {
    id: "x1",
    title: "Conflict Hotel",
    snippet: "가격 표기 10만원.",
    domain: "one.test",
    mediaType: "listing",
    reviewCount: 5,
    popularity: 0.4,
    metadata: { priceKrw: 100_000 },
  },
  {
    id: "x2",
    title: "Conflict Hotel B",
    snippet: "같은 구역인데 가격 표기 40만원.",
    domain: "two.test",
    mediaType: "review",
    reviewCount: 8,
    popularity: 0.4,
    metadata: { priceKrw: 400_000 },
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

async function main() {
  const agreeResult = await runResearchEngine({
    text: "게스트하우스 어디가 좋아?",
    provider: createFixtureCandidateProvider(agree),
  });
  assert.deepEqual([...agreeResult.stageTrace], [...RESEARCH_STAGES]);
  assert.equal(agreeResult.stageTrace.length, 10);
  assert.ok(agreeResult.confidence >= 0.4, `expected decent conf, got ${agreeResult.confidence}`);
  assert.ok(agreeResult.decision.best.candidateId);
  assert.ok(
    agreeResult.ranked.some((r) => r.rejected && r.rejectReason === "duplicate"),
  );

  const conflictResult = await runResearchEngine({
    text: "추천해줘 비교",
    provider: createFixtureCandidateProvider(conflict),
  });
  assert.ok(conflictResult.evidence.conflictingFacts.length >= 1);
  assert.ok(
    conflictResult.confidence < agreeResult.confidence,
    "conflict should lower confidence vs agreement case",
  );

  const weakResult = await runResearchEngine({
    text: "뭐가 나아?",
    provider: createFixtureCandidateProvider(weak),
  });
  assert.equal(weakResult.decision.evidenceWeak, true);
  assert.ok(weakResult.confidence < 0.5);
  assert.ok(/약/u.test(weakResult.decision.whyKo + weakResult.decision.best.summaryKo));

  console.log("✓ research engine v1 (10 stages · agreement · conflict · weak)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
