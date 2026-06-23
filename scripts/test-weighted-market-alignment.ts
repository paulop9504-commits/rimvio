#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { DEFAULT_MARKET_INTENT_DETAIL } from "../lib/globe/market/market-intent-detail";
import { getTopPrioritySlots } from "../lib/globe/market/market-priority-matrix";
import { scoreWeightedMarketAlignment } from "../lib/globe/market/score-weighted-market-alignment";
import type { MarketIntentRecord } from "../lib/globe/market/market-intent-types";

function phoneIntent(
  partial: Partial<MarketIntentRecord> & Pick<MarketIntentRecord, "id" | "eventId" | "role">,
): MarketIntentRecord {
  return {
    categoryId: "market.phone",
    title: "아이폰 15",
    priceMinKrw: 650_000,
    priceMaxKrw: 750_000,
    radiusKm: 5,
    anchorLat: 37.544,
    anchorLng: 127.055,
    placeLabel: "성수동",
    peakHour: null,
    confirmedAtIso: "2026-06-23T10:00:00+09:00",
    active: true,
    detail: {
      ...DEFAULT_MARKET_INTENT_DETAIL,
      productName: "아이폰 15",
      prioritySlots: {
        price: 700_000,
        battery_health: 85,
        cosmetic_grade: "good",
      },
    },
    ...partial,
  };
}

function main() {
  const phoneSlots = getTopPrioritySlots("market.phone");
  assert.equal(phoneSlots.length, 3);
  assert.equal(phoneSlots[0]!.field, "price");

  const seeking = phoneIntent({ id: "mi-s", eventId: "ev-s", role: "seeking" });
  const listing = phoneIntent({
    id: "mi-l",
    eventId: "ev-l",
    role: "listing",
    anchorLat: 37.545,
    anchorLng: 127.056,
    detail: {
      ...seeking.detail,
      prioritySlots: {
        price: 700_000,
        battery_health: 88,
        cosmetic_grade: "good",
      },
    },
  });

  const score = scoreWeightedMarketAlignment(seeking, listing);
  assert.ok(score.passes);
  assert.ok(score.total >= 0.72);
  assert.ok(score.topMatchedLabelsKo.length > 0);

  const badPrice = phoneIntent({
    id: "mi-b",
    eventId: "ev-b",
    role: "listing",
    priceMinKrw: 1_000_000,
    priceMaxKrw: 1_000_000,
    detail: {
      ...listing.detail,
      prioritySlots: { ...listing.detail.prioritySlots, price: 1_000_000 },
    },
  });
  const miss = scoreWeightedMarketAlignment(seeking, badPrice);
  assert.equal(miss.passes, false);

  console.log("test-weighted-market-alignment: ok");
}

main();
