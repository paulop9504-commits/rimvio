#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  isMarketProductTitleMatchForSeeking,
  parseMarketProductTitle,
} from "../lib/globe/market/match-market-product-title";
import type { MarketIntentRecord } from "../lib/globe/market/market-intent-types";

function mockIntent(input: {
  productName: string;
  title?: string;
}): MarketIntentRecord {
  return {
    id: "seek",
    eventId: "e1",
    userId: "u1",
    role: "seeking",
    categoryId: "market.phone",
    active: true,
    title: input.title ?? input.productName,
    anchorLat: 36.35,
    anchorLng: 127.38,
    radiusKm: 10,
    priceMinKrw: null,
    priceMaxKrw: null,
    confirmedAtIso: null,
    detail: {
      productName: input.productName,
      sourceText: input.productName,
      photoUrls: [],
      videoUrls: [],
      conditionId: null,
      availabilityPreset: "anytime",
      prioritySlots: {},
    },
  } as MarketIntentRecord;
}

function mockListing(productName: string): MarketIntentRecord {
  return {
    ...mockIntent({ productName }),
    id: "list",
    role: "listing",
    userId: "u2",
  } as MarketIntentRecord;
}

assert.deepEqual(parseMarketProductTitle("아이폰 15 프로"), {
  family: "iphone",
  generation: 15,
  variant: "pro",
});

const seeking15 = mockIntent({ productName: "아이폰 15" });
assert.equal(
  isMarketProductTitleMatchForSeeking(seeking15, mockListing("아이폰 15")),
  true,
);
assert.equal(
  isMarketProductTitleMatchForSeeking(seeking15, mockListing("아이폰 15 프로")),
  true,
);
assert.equal(
  isMarketProductTitleMatchForSeeking(seeking15, mockListing("아이폰 16")),
  false,
);
assert.equal(
  isMarketProductTitleMatchForSeeking(seeking15, mockListing("아이폰 14")),
  false,
);
assert.equal(
  isMarketProductTitleMatchForSeeking(seeking15, mockListing("아이폰")),
  false,
);

const seeking15Pro = mockIntent({ productName: "아이폰 15 프로" });
assert.equal(
  isMarketProductTitleMatchForSeeking(seeking15Pro, mockListing("아이폰 15")),
  false,
);

const seekingGalaxy = mockIntent({ productName: "갤럭시 S24" });
assert.equal(
  isMarketProductTitleMatchForSeeking(seekingGalaxy, mockListing("갤럭시 S24 울트라")),
  true,
);
assert.equal(
  isMarketProductTitleMatchForSeeking(seekingGalaxy, mockListing("갤럭시 S23")),
  false,
);

console.log("test-market-product-title-match: ok");
