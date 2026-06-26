#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { mergeDistrictLabelWithGpsCoords } from "../lib/globe/market/resolve-market-intent-pin-anchor";
import { isCoordPlaceLabel } from "../lib/globe/market/format-market-place-label";

const merged = mergeDistrictLabelWithGpsCoords({
  districtLabel: "대전 서구",
  districtLat: 36.3553,
  districtLng: 127.3847,
  gpsLat: 36.3012,
  gpsLng: 127.3211,
});

assert.equal(merged.placeLabel, "대전 서구");
assert.equal(merged.lat, 36.3012);
assert.equal(merged.lng, 127.3211);
assert.ok(isCoordPlaceLabel("36.3000°, 127.3200°"));
assert.ok(!isCoordPlaceLabel("대전 서구"));

console.log("test-market-intent-pin-anchor: ok");
