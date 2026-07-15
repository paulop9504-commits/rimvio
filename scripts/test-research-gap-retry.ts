/**
 * Gap-based retry: missing:reviewCount → places_details → axis rescore → next tool.
 */
import assert from "node:assert/strict";
import type { FastScanCandidate, RankedCandidate } from "../engines/research/schema";
import {
  detectResearchMissingFields,
  formatResearchResultComposeKo,
  pickResearchToolForMissing,
  runResearchEngine,
  runResearchSurgicalLoop,
  scoreResearchPersuasion,
  createFixtureCandidateProvider,
} from "../lib/research-engine";

const sparse: FastScanCandidate = {
  id: "gap-1",
  title: "Sparse Capsule",
  snippet: "도심 캡슐.",
  domain: "inventory.lodging.rimvio",
  mediaType: "listing",
  reviewCount: null,
  popularity: null,
  metadata: {
    lat: 35.6905,
    lng: 139.7002,
  },
};

async function main() {
  const ranked: RankedCandidate[] = [
    {
      candidate: sparse,
      axes: {
        relevance: 0.7,
        freshness: 0.5,
        authority: 0.5,
        popularity: 0.2,
        trust: 0.4,
        diversity: 0.5,
        userContext: 0.5,
      },
      totalScore: 0.5,
    },
  ];

  const persuasionContext = {
    message: "하루 10만원대 호텔 어디가 좋아?",
    maxNightlyPriceKrw: 100_000,
    anchorLat: 35.6895,
    anchorLng: 139.6917,
  };

  const missing = detectResearchMissingFields({ ranked, persuasionContext });
  assert.ok(missing.some((m) => m.field === "reviewCount"));
  assert.ok(missing.some((m) => m.missingKey === "missing:reviewCount"));
  assert.ok(missing.some((m) => m.field === "priceKrw"));

  const picked = pickResearchToolForMissing({
    missing,
    triedTools: new Set(),
    hasCoords: true,
    hasAnchor: true,
    strategy: "review_first",
  });
  assert.ok(picked);
  assert.equal(picked!.missingKey, "missing:reviewCount");
  assert.equal(picked!.toolId, "places_details");

  const beforeScore = scoreResearchPersuasion(ranked, persuasionContext).score;

  const surgical = await runResearchSurgicalLoop({
    ranked,
    persuasionContext,
    maxRounds: 6,
    strategy: "review_first",
    runtime: {
      async fetchPlacesDetails() {
        return {
          rating: 4.3,
          reviewCount: 210,
          lat: 35.6905,
          lng: 139.7002,
          // intentionally no price — forces rate_lookup next
        };
      },
      async fetchRate() {
        return { priceKrw: 92_000 };
      },
      async fetchYtPreview() {
        return { confidence: 0.88, videoTitle: "Sparse tour" };
      },
    },
  });

  assert.ok(surgical.gapRetryTrace.length >= 2);
  const first = surgical.gapRetryTrace[0]!;
  assert.equal(first.missingKey, "missing:reviewCount");
  assert.equal(first.toolId, "places_details");
  assert.equal(first.status, "ok");
  assert.ok(first.closedFields.includes("reviewCount"));
  assert.ok(first.persuasionAfter > first.persuasionBefore);

  // After reviews filled, price still missing → next tool
  const priceStep = surgical.gapRetryTrace.find(
    (s) => s.toolId === "rate_lookup" || s.missing === "priceKrw",
  );
  assert.ok(priceStep, "expected rate_lookup gap retry for missing:priceKrw");
  assert.equal(priceStep!.status, "ok");

  const afterScore = scoreResearchPersuasion(
    surgical.ranked,
    persuasionContext,
  ).score;
  assert.ok(afterScore > beforeScore);

  const best = surgical.ranked.find((r) => !r.rejected)?.candidate;
  assert.ok((best?.reviewCount ?? 0) >= 200);
  assert.equal(best?.metadata?.priceKrw, 92_000);

  const engine = await runResearchEngine({
    text: "하루 10만원대 호텔 리뷰 좋은 곳",
    provider: createFixtureCandidateProvider([sparse]),
    anchorLat: 35.6895,
    anchorLng: 139.6917,
    maxNightlyPriceKrw: 100_000,
    strategy: "review_first",
    toolRuntime: {
      async fetchPlacesDetails() {
        return { rating: 4.3, reviewCount: 210, lat: 35.6905, lng: 139.7002 };
      },
      async fetchRate() {
        return { priceKrw: 92_000 };
      },
      async fetchYtPreview() {
        return { confidence: 0.9, videoTitle: "tour" };
      },
    },
  });

  assert.ok((engine.gapRetryTrace?.length ?? 0) >= 2);
  assert.ok(
    engine.gapRetryTrace!.some(
      (s) => s.missingKey === "missing:reviewCount" && s.toolId === "places_details",
    ),
  );
  const compose = formatResearchResultComposeKo(engine);
  assert.match(compose, /갭 재시도/);
  assert.match(compose, /missing:reviewCount/);

  console.log(
    `✓ gap retry — steps=${surgical.gapRetryTrace.length} score ${beforeScore.toFixed(2)}→${afterScore.toFixed(2)}`,
  );
  for (const step of surgical.gapRetryTrace) {
    console.log(`  ${step.summaryKo}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
