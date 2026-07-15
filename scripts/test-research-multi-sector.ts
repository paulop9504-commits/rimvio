/**
 * Multi-sector surgery — lodging + eatery + activity each get a mini-op then merge.
 */
import assert from "node:assert/strict";
import type { FastScanCandidate } from "../engines/research/schema";
import {
  createFixtureCandidateProvider,
  formatResearchResultComposeKo,
  isMultiSectorResearch,
  isResearchUtterance,
  resolveResearchSectors,
  runResearchEngine,
  sectorOfRankedCandidate,
} from "../lib/research-engine";

const MSG_SCOUT = "하루 10만원대 호텔이랑 놀거리 그리고 맛집좀 추천해줘";
const MSG_RESEARCH = "호텔이랑 맛집이랑 놀거리 어디가 좋아?";

assert.equal(isResearchUtterance(MSG_SCOUT), false, "scout owns first multi-open");
assert.equal(isResearchUtterance(MSG_RESEARCH), true, "research owns 납득 follow-up");

const lodging: FastScanCandidate = {
  id: "h1",
  title: "Sector Hotel",
  snippet: "숙소",
  domain: "inventory.lodging.rimvio",
  mediaType: "listing",
  reviewCount: null,
  popularity: null,
  metadata: { kind: "lodging", lat: 35.69, lng: 139.7 },
};
const eatery: FastScanCandidate = {
  id: "e1",
  title: "Sector Sushi",
  snippet: "초밥",
  domain: "inventory.eatery.rimvio",
  mediaType: "listing",
  reviewCount: null,
  popularity: null,
  metadata: { kind: "eatery", lat: 35.691, lng: 139.701 },
};
const activity: FastScanCandidate = {
  id: "a1",
  title: "Sector Park",
  snippet: "공원",
  domain: "discovery.activity.rimvio",
  mediaType: "listing",
  reviewCount: null,
  popularity: null,
  metadata: { kind: "activity", lat: 35.688, lng: 139.698 },
};

assert.equal(sectorOfRankedCandidate({
  candidate: lodging,
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
}), "lodging");

async function main() {
  const provider = createFixtureCandidateProvider([lodging, eatery, activity]);
  const probe = await Promise.resolve(
    provider.listCandidates({ queries: [MSG_RESEARCH], limit: 10 }),
  );
  assert.ok(
    isMultiSectorResearch({
      message: MSG_RESEARCH,
      ranked: probe.map((c) => ({
        candidate: c,
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
      })),
    }),
  );
  assert.deepEqual(
    resolveResearchSectors({
      message: MSG_RESEARCH,
      ranked: probe.map((c) => ({
        candidate: c,
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
      })),
    }).sort(),
    ["activity", "eatery", "lodging"],
  );

  const result = await runResearchEngine({
    text: MSG_RESEARCH,
    provider,
    anchorLat: 35.6895,
    anchorLng: 139.6917,
    maxNightlyPriceKrw: 100_000,
    strategy: "review_first",
    surgicalMaxRounds: 3,
    toolRuntime: {
      async fetchPlacesDetails(input) {
        return {
          rating: 4.2,
          reviewCount: 120,
          lat: input.lat ?? 35.69,
          lng: input.lng ?? 139.7,
          priceKrw: input.title.includes("Hotel") ? 90_000 : null,
        };
      },
      async fetchRate() {
        return { priceKrw: 90_000 };
      },
      async fetchYtPreview() {
        return { confidence: 0.8, videoTitle: "sector tour" };
      },
    },
  });

  assert.ok((result.sectorResults?.length ?? 0) >= 3, "expect 3 sector results");
  const ids = new Set(
    result.sectorResults!.map((s) => s.bestCandidateId).filter(Boolean),
  );
  assert.ok(ids.has("h1"));
  assert.ok(ids.has("e1"));
  assert.ok(ids.has("a1"));
  assert.ok(
    result.sectorResults!.every((s) => s.bestCandidateId),
    "each sector picks a winner",
  );

  const compose = formatResearchResultComposeKo(result);
  assert.match(compose, /멀티 섹터/);
  assert.match(compose, /섹터별 수술/);
  assert.match(compose, /숙소/);
  assert.match(compose, /맛집/);
  assert.match(compose, /놀거리/);

  console.log(
    `✓ multi-sector surgery — sectors=${result.sectorResults!.map((s) => `${s.labelKo}:${s.bestTitle}`).join(" · ")}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
