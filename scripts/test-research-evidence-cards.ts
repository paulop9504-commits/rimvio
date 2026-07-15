/**
 * Evidence cards — Called X → got Y transparency.
 */
import assert from "node:assert/strict";
import type { FastScanCandidate, RankedCandidate } from "../engines/research/schema";
import {
  buildResearchEvidenceCards,
  createFixtureCandidateProvider,
  formatCalledGotLine,
  formatResearchEvidenceCardsKo,
  formatResearchResultComposeKo,
  runResearchEngine,
  runResearchSurgicalLoop,
} from "../lib/research-engine";

const sparse: FastScanCandidate = {
  id: "ev-1",
  title: "Evidence Inn",
  snippet: "도심.",
  domain: "inventory.lodging.rimvio",
  mediaType: "listing",
  reviewCount: null,
  popularity: null,
  metadata: { lat: 35.69, lng: 139.7 },
};

async function main() {
  assert.equal(
    formatCalledGotLine({
      called: "places.reviews",
      status: "ok",
      gotLine: "reviews=210 · ★4.3",
    }),
    "Called places.reviews → got reviews=210 · ★4.3",
  );

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
    message: "하루 10만원대 호텔",
    maxNightlyPriceKrw: 100_000,
    anchorLat: 35.6895,
    anchorLng: 139.6917,
  };

  const surgical = await runResearchSurgicalLoop({
    ranked,
    persuasionContext,
    maxRounds: 5,
    runtime: {
      async fetchPlacesDetails() {
        return {
          rating: 4.3,
          reviewCount: 210,
          lat: 35.69,
          lng: 139.7,
        };
      },
      async fetchRate() {
        return { priceKrw: 88_000 };
      },
      async fetchYtPreview() {
        return { confidence: 0.91, videoTitle: "Evidence tour" };
      },
    },
  });

  const cards = buildResearchEvidenceCards({
    toolTrace: surgical.toolTrace,
    ranked: surgical.ranked,
  });
  assert.ok(cards.length >= 2);
  assert.ok(cards.some((c) => c.called === "places.reviews" && c.status === "ok"));
  assert.ok(cards.some((c) => c.lineKo.includes("Called places.reviews → got")));
  assert.ok(
    cards.some(
      (c) =>
        c.called === "liteapi.rate" ||
        c.called === "distance(anchor)" ||
        c.called === "youtube.preview",
    ),
  );

  const block = formatResearchEvidenceCardsKo(cards);
  assert.match(block, /증거 카드/);
  assert.match(block, /Called places\.reviews/);

  const engine = await runResearchEngine({
    text: "하루 10만원대 호텔 어디가 좋아?",
    provider: createFixtureCandidateProvider([sparse]),
    anchorLat: 35.6895,
    anchorLng: 139.6917,
    maxNightlyPriceKrw: 100_000,
    toolRuntime: {
      async fetchPlacesDetails() {
        return { rating: 4.3, reviewCount: 210, lat: 35.69, lng: 139.7 };
      },
      async fetchRate() {
        return { priceKrw: 88_000 };
      },
      async fetchYtPreview() {
        return { confidence: 0.9, videoTitle: "tour" };
      },
    },
  });

  assert.ok((engine.evidenceCards?.length ?? 0) >= 1);
  const compose = formatResearchResultComposeKo(engine);
  assert.match(compose, /증거 카드/);
  assert.match(compose, /Called places\.reviews → got/);
  assert.ok(
    /Called (liteapi\.rate|distance\(anchor\)|youtube\.preview)/.test(compose),
  );

  console.log("✓ evidence cards");
  for (const line of (engine.evidenceCards ?? []).map((c) => c.lineKo)) {
    console.log(`  ${line}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
