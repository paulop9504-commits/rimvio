#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { DEFAULT_MARKET_INTENT_DETAIL } from "../lib/globe/market/market-intent-detail";
import { resolveMarketAlignmentGapAsk } from "../lib/globe/market/resolve-market-alignment-gap-ask";
import type { MarketIntentRecord } from "../lib/globe/market/market-intent-types";

function intent(partial: Partial<MarketIntentRecord> & Pick<MarketIntentRecord, "id" | "eventId" | "role">): MarketIntentRecord {
  return {
    categoryId: "market.phone",
    title: "아이폰 15 프로",
    priceMinKrw: 800_000,
    priceMaxKrw: 800_000,
    radiusKm: 5,
    anchorLat: 36.35,
    anchorLng: 127.38,
    placeLabel: "대전",
    peakHour: null,
    confirmedAtIso: "2026-06-10T12:00:00.000Z",
    active: true,
    detail: { ...DEFAULT_MARKET_INTENT_DETAIL, productName: "아이폰 15 프로" },
    ...partial,
  };
}

const seeking = intent({
  id: "mi-seek",
  eventId: "ev-seek",
  role: "seeking",
  priceMinKrw: null,
  priceMaxKrw: 850_000,
  detail: {
    ...DEFAULT_MARKET_INTENT_DETAIL,
    productName: "아이폰 15 프로",
    prioritySlots: {},
  },
});

const listing = intent({
  id: "mi-list",
  eventId: "ev-list",
  role: "listing",
  detail: {
    ...DEFAULT_MARKET_INTENT_DETAIL,
    productName: "아이폰 15 프로",
    prioritySlots: { battery_health: 88 },
  },
});

const gap = resolveMarketAlignmentGapAsk({
  self: seeking,
  match: listing,
  copy: {
    prompt: (label) => `맞추려면 ${label}만 확인해 주세요`,
  },
});

assert.ok(gap);
assert.equal(gap!.field, "battery_health");
assert.ok(gap!.chips.some((chip) => chip.value === 85));

console.log("test-market-alignment-gap-ask: ok");
