#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { ContextLodgingInventoryRow } from "../lib/globe/context-hub/lodging-resource-types";
import {
  filterVerifiedLodgingRows,
  lodgingVerificationModeFromExploration,
  verifyLodgingCandidate,
} from "../lib/globe/lodging/verify-lodging-candidate";

function row(
  partial: Partial<ContextLodgingInventoryRow> &
    Pick<ContextLodgingInventoryRow, "placeId" | "name">,
): ContextLodgingInventoryRow {
  return {
    lat: 34.6937,
    lng: 135.5023,
    images: [],
    ...partial,
  };
}

const thin = row({
  placeId: "thin",
  name: "사진 없는 여관",
  provider: "google_places",
  images: [],
});
const solid = row({
  placeId: "solid",
  name: "난바 스테이",
  provider: "liteapi",
  liteapiHotelId: "htl-1",
  priceKrw: 98_000,
  images: ["a.jpg", "b.jpg"],
  photoConfidence: "exact_place_id",
  address: "난바",
});
const mockOnly = row({
  placeId: "mock",
  name: "목 호텔",
  provider: "mock",
  images: ["a.jpg"],
  photoConfidence: "mock",
});

assert.equal(verifyLodgingCandidate({ row: thin, mode: "strict" }).ok, false);
assert.equal(verifyLodgingCandidate({ row: solid, mode: "strict" }).ok, true);
assert.equal(verifyLodgingCandidate({ row: mockOnly, mode: "strict" }).ok, false);

const filtered = filterVerifiedLodgingRows({
  rows: [thin, solid, mockOnly],
  mode: "strict",
});
assert.equal(filtered.kept.length, 1);
assert.equal(filtered.kept[0]?.placeId, "solid");
assert.equal(filtered.usedRawFallback, false);

const emptiedFallback = filterVerifiedLodgingRows({
  rows: [thin, mockOnly],
  mode: "strict",
});
assert.ok(emptiedFallback.kept.length >= 1);
assert.equal(lodgingVerificationModeFromExploration("diffuse"), "relaxed");
assert.equal(lodgingVerificationModeFromExploration("convergent"), "strict");

console.log("test-lodging-verify-candidate: ok");
