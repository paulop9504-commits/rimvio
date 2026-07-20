#!/usr/bin/env npx tsx
/**
 * Value-consensus ranking — 가성비 · 표본 중앙 · bland/expensive-mediocre demotion.
 */

import assert from "node:assert/strict";
import {
  rankByValueConsensus,
  scoreValueConsensusCandidate,
} from "../lib/search-engine/score-value-consensus";
import { invokeRimvioTool } from "../lib/tool-registry";

{
  const bland = {
    id: "a",
    labelKo: "밋밋한 시드호텔",
    rating: 4.0,
    walkMinutes: 12,
    priceBand: 2,
    reservable: true,
    localFavorite: false,
  };
  const consensus = {
    id: "b",
    labelKo: "가성비 합의",
    rating: 4.55,
    walkMinutes: 7,
    priceBand: 2,
    reservable: true,
    localFavorite: true,
  };
  const expensiveMediocre = {
    id: "c",
    labelKo: "비싸고 별로",
    rating: 3.85,
    walkMinutes: 14,
    priceBand: 4,
    reservable: true,
    localFavorite: false,
  };

  // Seed index order A,B,C — consensus must reorder B > A > C
  const ranked = rankByValueConsensus([bland, consensus, expensiveMediocre]);
  assert.deepEqual(
    ranked.map((r) => r.id),
    ["b", "a", "c"],
    `expected B>A>C, got ${ranked.map((r) => r.id).join(",")}`,
  );
}

{
  const pick = invokeRimvioTool("ranking.pick", {
    utterance: "가성비 좋은 곳",
    candidates: [
      {
        id: "seed0",
        labelKo: "첫 시드",
        rating: 4.0,
        walkMinutes: 12,
        priceBand: 2,
        reservable: true,
      },
      {
        id: "value",
        labelKo: "합의 가성비",
        rating: 4.6,
        walkMinutes: 6,
        priceBand: 2,
        reservable: true,
        localFavorite: true,
      },
      {
        id: "pricey",
        labelKo: "비싸고 평범",
        rating: 3.9,
        walkMinutes: 15,
        priceBand: 4,
        reservable: true,
      },
    ],
  });
  assert.equal(pick.pickedLabelKo, "합의 가성비");
  assert.equal(pick.candidates?.[0]?.id, "value");
  assert.equal(pick.candidates?.at(-1)?.id, "pricey");
}

{
  const cohort = {
    ratingCenter: 4.2,
    priceMedian: 2,
    walkCenter: 10,
    reviewMedian: 40,
    priceKrwMedian: null as number | null,
  };
  const good = scoreValueConsensusCandidate(
    {
      rating: 4.5,
      priceBand: 2,
      walkMinutes: 8,
      localFavorite: true,
      reservable: true,
      reviewCount: 90,
      priceKrw: 90_000,
    },
    cohort,
  );
  const bad = scoreValueConsensusCandidate(
    {
      rating: 3.8,
      priceBand: 4,
      walkMinutes: 18,
      localFavorite: false,
      reservable: true,
      reviewCount: 3,
      priceKrw: 280_000,
    },
    cohort,
  );
  assert.ok(good.total > bad.total);
  assert.ok(bad.expensiveMediocrePenalty > 0);
}

console.log("ok — value-consensus");
