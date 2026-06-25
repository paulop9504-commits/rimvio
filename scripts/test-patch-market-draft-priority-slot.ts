#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { DEFAULT_MARKET_INTENT_DETAIL } from "../lib/globe/market/market-intent-detail";
import type { MarketIntentDraft } from "../lib/globe/market/market-intent-types";
import {
  normalizeMarketIntentDraftFromPrioritySlots,
  patchMarketDraftPrioritySlot,
} from "../lib/globe/market/patch-market-draft-priority-slot";

function baseDraft(): MarketIntentDraft {
  return {
    eventId: "ev-test",
    role: "seeking",
    categoryId: "market.phone",
    title: "아이폰 15 프로",
    priceMinKrw: null,
    priceMaxKrw: null,
    radiusKm: 5,
    anchorLat: 37.5,
    anchorLng: 127.0,
    placeLabel: "성수동",
    peakHour: null,
    prefillSources: [],
    detail: {
      ...DEFAULT_MARKET_INTENT_DETAIL,
      productName: "아이폰 15 프로",
      prioritySlots: {},
    },
  };
}

function main() {
  const withPrice = patchMarketDraftPrioritySlot(baseDraft(), "price", 700_000);
  assert.equal(withPrice.priceMinKrw, 700_000);
  assert.equal(withPrice.priceMaxKrw, 700_000);
  assert.equal(withPrice.detail.prioritySlots.price, 700_000);

  const withCosmetic = patchMarketDraftPrioritySlot(
    baseDraft(),
    "cosmetic_grade",
    "like_new",
  );
  assert.equal(withCosmetic.detail.conditionId, "like_new");

  const normalized = normalizeMarketIntentDraftFromPrioritySlots({
    ...baseDraft(),
    detail: {
      ...baseDraft().detail,
      prioritySlots: {
        battery_health: 85,
        storage_gb: 256,
        price: 800_000,
        cosmetic_grade: "good",
      },
    },
  });
  assert.equal(normalized.priceMinKrw, 800_000);
  assert.equal(normalized.detail.conditionId, "good");

  console.log("test-patch-market-draft-priority-slot: ok");
}

main();
