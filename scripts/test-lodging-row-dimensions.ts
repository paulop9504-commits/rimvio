#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { DEFAULT_LODGING_RANK_PROFILE } from "../lib/globe/lodging/lodging-rank-profile";
import {
  computeWeightedLodgingRankScore,
  scoreLodgingDistanceDimension,
  scoreLodgingPriceDimension,
  scoreLodgingRowDimensions,
} from "../lib/globe/lodging/score-lodging-row-dimensions";
import type { ContextLodgingInventoryRow } from "../lib/globe/context-hub/lodging-resource-types";

const row: ContextLodgingInventoryRow = {
  placeId: "lodging-a",
  name: "난바 패밀리 스위트",
  lat: 34.69,
  lng: 135.5,
  priceKrw: 85_000,
  partnerLabel: "LiteAPI",
  address: "난바 역 앞",
  mapsUrl: null,
  checkInIso: null,
  checkOutIso: null,
  stayWindow: null,
  images: ["a.jpg", "b.jpg"],
  provider: "liteapi",
};

assert.equal(scoreLodgingDistanceDimension(0.5), 100);
assert.equal(scoreLodgingDistanceDimension(null), 50);
assert.ok(scoreLodgingPriceDimension(70_000) > scoreLodgingPriceDimension(200_000));

const { dimensions } = scoreLodgingRowDimensions({
  row,
  lat: 34.69,
  lng: 135.5,
  lodgingPriority: "family",
});
assert.ok(dimensions.quality >= 70);
assert.ok(dimensions.distance >= 90);

const weighted = computeWeightedLodgingRankScore(dimensions, DEFAULT_LODGING_RANK_PROFILE);
assert.ok(weighted >= 55 && weighted <= 100);

console.log("test-lodging-row-dimensions: ok");
