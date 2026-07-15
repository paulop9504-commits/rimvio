/**
 * Research surgical tools — gap → pick → merge → rescore.
 */
import assert from "node:assert/strict";
import type { FastScanCandidate, RankedCandidate } from "../engines/research/schema";
import {
  createFixtureCandidateProvider,
  detectResearchGaps,
  formatResearchResultComposeKo,
  pickResearchTool,
  runResearchEngine,
  runResearchSurgicalLoop,
} from "../lib/research-engine";

const sparse: FastScanCandidate = {
  id: "sparse-1",
  title: "Nebula Capsule Hotel",
  snippet: "도심 캡슐. 하루 9.5만원대 표기.",
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

  const gapsBefore = detectResearchGaps({ ranked, persuasionContext });
  assert.ok(gapsBefore.some((g) => g.axisId === "observation"));
  assert.ok(gapsBefore.some((g) => g.axisId === "priceFit"));

  const picked = pickResearchTool({
    gaps: gapsBefore,
    tried: new Set(),
    hasCoords: true,
    hasAnchor: true,
  });
  assert.equal(picked, "places_details");

  const surgical = await runResearchSurgicalLoop({
    ranked,
    persuasionContext,
    maxRounds: 4,
    runtime: {
      async fetchPlacesDetails() {
        return {
          rating: 4.2,
          reviewCount: 156,
          lat: 35.6905,
          lng: 139.7002,
          priceKrw: 95_000,
        };
      },
      async fetchYtPreview() {
        return { confidence: 0.82, videoTitle: "Nebula room tour" };
      },
    },
  });

  assert.ok(surgical.toolTrace.some((t) => t.toolId === "places_details" && t.status === "ok"));
  const best = surgical.ranked.find((r) => !r.rejected)?.candidate;
  assert.ok(best);
  assert.ok((best!.reviewCount ?? 0) >= 100);
  assert.equal(best!.metadata?.priceKrw, 95_000);
  // distance axis fills from lat/lng; distance_check may run or become unnecessary
  const ranDistance = surgical.toolTrace.some(
    (t) => t.toolId === "distance_check" && t.status === "ok",
  );
  const hasCoords =
    typeof best!.metadata?.lat === "number" &&
    typeof best!.metadata?.lng === "number";
  assert.ok(ranDistance || hasCoords);

  const gapsAfter = detectResearchGaps({
    ranked: surgical.ranked,
    persuasionContext,
  });
  assert.ok(
    gapsAfter.filter((g) => g.axisId === "observation" || g.axisId === "priceFit")
      .length < gapsBefore.filter((g) => g.axisId === "observation" || g.axisId === "priceFit")
      .length,
  );

  const engine = await runResearchEngine({
    text: "하루 10만원대 호텔 어디가 좋아?",
    provider: createFixtureCandidateProvider([sparse]),
    anchorLat: 35.6895,
    anchorLng: 139.6917,
    maxNightlyPriceKrw: 100_000,
    toolRuntime: {
      async fetchPlacesDetails() {
        return {
          rating: 4.2,
          reviewCount: 156,
          lat: 35.6905,
          lng: 139.7002,
          priceKrw: 95_000,
        };
      },
      async fetchYtPreview() {
        return { confidence: 0.8, videoTitle: "tour" };
      },
    },
  });
  assert.ok((engine.toolTrace?.length ?? 0) >= 1);
  assert.ok(engine.confidence >= 0.5);
  assert.ok(
    engine.toolTrace!.some((t) =>
      ["places_details", "rate_lookup", "distance_check", "yt_preview"].includes(
        t.toolId,
      ),
    ),
  );
  const compose = formatResearchResultComposeKo(engine);
  assert.match(compose, /places_details|rate_lookup|yt_preview|distance_check/);

  console.log(
    `✓ surgical tools — rounds=${engine.toolTrace?.length} conf=${(engine.confidence * 100).toFixed(0)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
