#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { DEFAULT_MARKET_INTENT_DETAIL } from "../lib/globe/market/market-intent-detail";
import {
  readListingAskBounds,
  readSeekingBudgetBounds,
  scoreMarketPriceAlignment,
} from "../lib/globe/market/score-market-price-alignment";
import { scoreWeightedMarketAlignment } from "../lib/globe/market/score-weighted-market-alignment";
import type { MarketIntentRecord } from "../lib/globe/market/market-intent-types";

function intent(
  partial: Partial<MarketIntentRecord> & Pick<MarketIntentRecord, "role">,
): MarketIntentRecord {
  return {
    id: partial.role,
    eventId: partial.role,
    categoryId: "market.phone",
    title: "아이폰 15 프로",
    priceMinKrw: null,
    priceMaxKrw: null,
    radiusKm: 5,
    anchorLat: 37.5,
    anchorLng: 127.0,
    placeLabel: "강남",
    peakHour: null,
    confirmedAtIso: "2026-06-23T10:00:00+09:00",
    active: true,
    detail: {
      ...DEFAULT_MARKET_INTENT_DETAIL,
      productName: "아이폰 15 프로",
      prioritySlots: { battery_health: 85, cosmetic_grade: "good" },
    },
    ...partial,
  };
}

function main() {
  const seeking80 = intent({
    role: "seeking",
    priceMinKrw: 800_000,
    priceMaxKrw: 800_000,
  });
  const listing70 = intent({
    role: "listing",
    priceMinKrw: 700_000,
    priceMaxKrw: 700_000,
  });
  assert.equal(scoreMarketPriceAlignment(seeking80, listing70), 1);
  assert.deepEqual(readSeekingBudgetBounds(seeking80), { minKrw: 0, maxKrw: 800_000 });
  assert.deepEqual(readListingAskBounds(listing70), { minKrw: 700_000, maxKrw: 700_000 });

  const seeking70 = intent({
    role: "seeking",
    priceMinKrw: 700_000,
    priceMaxKrw: 700_000,
  });
  const listing80 = intent({
    role: "listing",
    priceMinKrw: 800_000,
    priceMaxKrw: 800_000,
  });
  const gapScore = scoreMarketPriceAlignment(seeking70, listing80);
  assert.ok(gapScore >= 0.6 && gapScore < 1, `expected partial gap score, got ${gapScore}`);

  const seeking70Neg = intent({
    role: "seeking",
    priceMinKrw: 700_000,
    priceMaxKrw: 700_000,
    detail: { ...seeking70.detail, priceNegotiable: true },
  });
  assert.ok(scoreMarketPriceAlignment(seeking70Neg, listing80) >= 0.55);

  const weighted = scoreWeightedMarketAlignment(seeking80, listing70);
  assert.ok(weighted.passes, `buyer 80 / seller 70 should pass, got ${weighted.total}`);

  const weightedGap = scoreWeightedMarketAlignment(seeking70, listing80);
  assert.ok(
    weightedGap.total >= 0.72,
    `buyer 70 / seller 80 with good slots should pass, got ${weightedGap.total}`,
  );

  const seeking750 = intent({
    role: "seeking",
    priceMinKrw: 650_000,
    priceMaxKrw: 750_000,
  });
  const listing1m = intent({
    role: "listing",
    priceMinKrw: 1_000_000,
    priceMaxKrw: 1_000_000,
  });
  const miss = scoreWeightedMarketAlignment(seeking750, listing1m);
  assert.equal(miss.passes, false);

  console.log("test-market-price-alignment: ok");
}

main();
