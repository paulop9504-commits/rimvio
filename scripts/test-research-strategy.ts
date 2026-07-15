/**
 * Strategy lenses — budget/distance/review-first + multi-pass switch when weak.
 */
import assert from "node:assert/strict";
import type { FastScanCandidate } from "../engines/research/schema";
import {
  createFixtureCandidateProvider,
  formatResearchResultComposeKo,
  pickResearchTool,
  resolveInitialResearchStrategy,
  resolveNextResearchStrategy,
  runResearchEngine,
  shouldSwitchResearchStrategy,
} from "../lib/research-engine";

assert.equal(
  resolveInitialResearchStrategy({
    message: "하루 10만원대 호텔 어디가 좋아?",
    maxNightlyPriceKrw: 100_000,
  }),
  "budget_first",
);
assert.equal(
  resolveInitialResearchStrategy({
    message: "리뷰 좋은 숙소 추천해줘",
  }),
  "review_first",
);

const next = resolveNextResearchStrategy({
  current: "budget_first",
  message: "어디가 좋아?",
  confidence: 0.3,
});
assert.ok(next);
assert.notEqual(next!.strategy, "budget_first");
assert.equal(next!.switched, true);

const gaps = [
  { axisId: "observation" as const, reasonKo: "관측" },
  { axisId: "priceFit" as const, reasonKo: "가격" },
  { axisId: "distance" as const, reasonKo: "동선" },
];
assert.equal(
  pickResearchTool({
    gaps,
    tried: new Set(),
    hasCoords: true,
    hasAnchor: true,
    strategy: "budget_first",
  }),
  "rate_lookup",
);
assert.equal(
  pickResearchTool({
    gaps,
    tried: new Set(),
    hasCoords: true,
    hasAnchor: true,
    strategy: "review_first",
  }),
  "places_details",
);

const weakRow: FastScanCandidate = {
  id: "w1",
  title: "Thin Signal Inn",
  snippet: "짧음",
  domain: "solo.test",
  mediaType: "unknown",
  reviewCount: 0,
  popularity: 0.1,
};

async function main() {
  const result = await runResearchEngine({
    text: "어디가 좋아?",
    provider: createFixtureCandidateProvider([weakRow]),
    strategy: "balanced",
  });
  assert.ok((result.strategyTrace?.length ?? 0) >= 1);
  // Weak conf / thin evidence must switch at least once.
  assert.ok(
    (result.strategyTrace?.length ?? 0) >= 2,
    `expected ≥1 strategy switch, got trace=${JSON.stringify(result.strategyTrace)} conf=${result.confidence}`,
  );
  assert.ok(
    result.strategyTrace!.some((s) => /전환/.test(s.reasonKo)),
    "compose-facing switch reason missing",
  );

  // Multi-pass: thin row keeps switching toward remaining lenses (max 2).
  assert.ok(
    (result.strategyTrace?.length ?? 0) <= 3,
    "max 1 opening + 2 switches",
  );

  const budgetMsg = await runResearchEngine({
    text: "하루 10만원대 호텔 어디가 좋아?",
    provider: createFixtureCandidateProvider([
      {
        id: "cheap",
        title: "Budget Stay",
        snippet: "가성비. 리뷰 90건. ★4.0",
        domain: "inventory.lodging.rimvio",
        reviewCount: 90,
        popularity: 0.8,
        mediaType: "listing",
        metadata: { priceKrw: 88_000, lat: 35.69, lng: 139.7 },
      },
      {
        id: "far",
        title: "Far Luxury",
        snippet: "비쌈. 리뷰 10건.",
        domain: "inventory.lodging.rimvio",
        reviewCount: 10,
        popularity: 0.5,
        mediaType: "listing",
        metadata: { priceKrw: 250_000, lat: 35.75, lng: 139.8 },
      },
    ]),
    maxNightlyPriceKrw: 100_000,
    anchorLat: 35.6895,
    anchorLng: 139.6917,
  });
  assert.equal(budgetMsg.strategyTrace?.[0]?.strategy, "budget_first");
  assert.ok(budgetMsg.decision.best.candidateId === "cheap");

  // Gap-aware next: missing price → prefer budget_first when not tried.
  const priceNext = resolveNextResearchStrategy({
    current: "review_first",
    message: "호텔",
    confidence: 0.4,
    hasAnchor: true,
    ranked: [
      {
        candidate: {
          id: "p1",
          title: "No Price Hotel",
          snippet: "리뷰 있음",
          domain: "inventory.lodging.rimvio",
          mediaType: "listing",
          reviewCount: 120,
          popularity: 0.8,
          metadata: { lat: 35.69, lng: 139.7 },
        },
        axes: {
          relevance: 0.5,
          freshness: 0.5,
          authority: 0.5,
          popularity: 0.5,
          trust: 0.5,
          diversity: 0.5,
          userContext: 0.5,
        },
        totalScore: 0.5,
      },
    ],
    persuasionContext: {
      message: "호텔",
      maxNightlyPriceKrw: 100_000,
      anchorLat: 35.6895,
      anchorLng: 139.6917,
    },
    triedStrategies: new Set(["review_first"]),
    switchCount: 0,
  });
  assert.ok(priceNext);
  assert.equal(priceNext!.strategy, "budget_first");

  assert.equal(
    shouldSwitchResearchStrategy({
      confidence: 0.8,
      ranked: budgetMsg.ranked,
      persuasionContext: {
        message: "하루 10만원대",
        maxNightlyPriceKrw: 100_000,
        anchorLat: 35.6895,
        anchorLng: 139.6917,
      },
      switchCount: 0,
    }),
    false,
  );

  const compose = formatResearchResultComposeKo(result);
  assert.match(compose, /렌즈:/);
  assert.match(compose, /전환/);

  console.log(
    `✓ strategy lenses — initial=${budgetMsg.strategyTrace?.[0]?.strategy} weakSwitches=${(result.strategyTrace?.length ?? 1) - 1}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
