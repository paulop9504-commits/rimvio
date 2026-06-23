#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveMarketListingTradePlace } from "../lib/globe/market/resolve-market-listing-trade-place";
import { resolveKoreaPlaceFromCoords } from "../lib/globe/korea-place-from-coords";
import { listMetroDistrictsForCity } from "../lib/globe/korea-metro-districts";

const daejeon = resolveKoreaPlaceFromCoords(36.3553, 127.3847);
assert.ok(daejeon.label.includes("대전"));

const jejuPhoto = { placeLabel: "제주", lat: 33.4996, lng: 126.5312 };
const mismatch = resolveMarketListingTradePlace({
  gpsLat: 36.3553,
  gpsLng: 127.3847,
  photoMemory: jejuPhoto,
});
assert.equal(mismatch.kind, "mismatch");
if (mismatch.kind === "mismatch") {
  assert.equal(mismatch.metroCity, "대전");
}

const auto = resolveMarketListingTradePlace({
  gpsLat: 36.3553,
  gpsLng: 127.3847,
  photoMemory: null,
});
assert.equal(auto.kind, "auto");

const daejeonDistricts = listMetroDistrictsForCity("대전");
assert.ok(daejeonDistricts.length >= 5);

console.log("test-market-listing-trade-place: ok");
