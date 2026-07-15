/**
 * Research stream lines + parallel multi-sector + abort smoke.
 */
import assert from "node:assert/strict";
import type { FastScanCandidate } from "../engines/research/schema";
import {
  createFixtureCandidateProvider,
  formatResearchGapStreamLine,
  formatResearchLensStreamLine,
  formatResearchRescoreStreamLine,
  formatResearchSectorStreamLine,
  formatResearchToolStreamLine,
  runMultiSectorResearchSurgery,
  runResearchEngine,
  runResearchSurgicalLoop,
} from "../lib/research-engine";
import {
  formatResearchGapStreamLine as gapLine,
} from "../lib/research-engine/format-research-stream-event";
import { beginResearchRun } from "../lib/research-engine/research-run-controller";

// Re-export check — format helpers available for compose wiring.
assert.equal(typeof gapLine, "function");

assert.match(
  formatResearchLensStreamLine("budget_first"),
  /^lens → budget_first$/,
);
assert.match(formatResearchSectorStreamLine("lodging", "merge"), /merge/);
assert.match(
  formatResearchRescoreStreamLine({ confidence: 0.84, rankTitle: "Nebula" }),
  /rescore · conf 84% · #Nebula/,
);
assert.match(
  formatResearchGapStreamLine({ missing: "reviewCount", toolId: "places_details" }),
  /gap · reviewCount → places_details/,
);

const lodging: FastScanCandidate = {
  id: "h1",
  title: "Stream Hotel",
  snippet: "숙소",
  domain: "inventory.lodging.rimvio",
  mediaType: "listing",
  reviewCount: null,
  popularity: null,
  metadata: { kind: "lodging", lat: 35.69, lng: 139.7, priceKrw: 90_000 },
};
const eatery: FastScanCandidate = {
  id: "e1",
  title: "Stream Sushi",
  snippet: "초밥",
  domain: "inventory.eatery.rimvio",
  mediaType: "listing",
  reviewCount: null,
  popularity: null,
  metadata: { kind: "eatery", lat: 35.691, lng: 139.701 },
};

async function main() {
  const lines: string[] = [];
  const t0 = Date.now();
  let ttft: number | null = null;

  const result = await runResearchEngine({
    text: "호텔이랑 맛집 어디가 좋아?",
    provider: createFixtureCandidateProvider([lodging, eatery]),
    anchorLat: 35.6895,
    anchorLng: 139.6917,
    maxNightlyPriceKrw: 100_000,
    strategy: "budget_first",
    surgicalMaxRounds: 3,
    runtime: undefined,
    toolRuntime: {
      async fetchPlacesDetails() {
        return {
          rating: 4.4,
          reviewCount: 120,
          lat: 35.69,
          lng: 139.7,
          priceKrw: 90_000,
        };
      },
    },
    onTool: (line) => {
      if (ttft == null) ttft = Date.now() - t0;
      lines.push(line);
    },
  });

  assert.ok(lines.length >= 2, "stream emits before decision");
  assert.ok(
    lines.some((l) => /Called live\.inventory|lens →/u.test(l)),
    "TTFT includes live or lens line",
  );
  assert.ok(result.confidence > 0);
  assert.ok(ttft != null && ttft >= 0);

  // Parallel multi-sector still merges.
  const multi = await runMultiSectorResearchSurgery({
    ranked: [
      {
        candidate: lodging,
        axes: {
          relevance: 0.6,
          freshness: 0.5,
          authority: 0.5,
          popularity: 0.4,
          trust: 0.5,
          diversity: 0.5,
          userContext: 0.5,
        },
        totalScore: 0.5,
      },
      {
        candidate: eatery,
        axes: {
          relevance: 0.6,
          freshness: 0.5,
          authority: 0.5,
          popularity: 0.4,
          trust: 0.5,
          diversity: 0.5,
          userContext: 0.5,
        },
        totalScore: 0.5,
      },
    ],
    persuasionContext: {
      message: "호텔이랑 맛집",
      maxNightlyPriceKrw: 100_000,
      anchorLat: 35.6895,
      anchorLng: 139.6917,
    },
    sectors: ["lodging", "eatery"],
    strategy: "balanced",
    maxRoundsPerSector: 2,
    runtime: {
      async fetchPlacesDetails() {
        return { rating: 4.1, reviewCount: 80, lat: 35.69, lng: 139.7 };
      },
    },
  });
  assert.equal(multi.sectorResults.length, 2);
  assert.ok(multi.ranked.length >= 2);

  // Abort mid surgical loop.
  const run = beginResearchRun("ctx-stream-abort");
  run.abort();
  await assert.rejects(
    () =>
      runResearchSurgicalLoop({
        ranked: [
          {
            candidate: lodging,
            axes: {
              relevance: 0.6,
              freshness: 0.5,
              authority: 0.5,
              popularity: 0.4,
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
        signal: run.signal,
        maxRounds: 3,
      }),
    (err: unknown) =>
      err instanceof Error &&
      (err.name === "AbortError" || err.message === "research_aborted"),
  );

  // Tool stream formatter
  const line = formatResearchToolStreamLine({
    toolId: "places_details",
    candidateId: "h1",
    status: "ok",
    summaryKo: "ok",
    filledAxes: ["observation"],
    patch: null,
    evidence: {
      called: "places.reviews",
      args: { title: "H" },
      got: { reviews: 10 },
      gotLine: "reviews=10",
    },
  });
  assert.match(line, /Called places\.reviews → got reviews=10/);

  console.log(
    `✓ research stream+parallel — lines=${lines.length} ttft≈${ttft}ms wall≈${Date.now() - t0}ms`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
