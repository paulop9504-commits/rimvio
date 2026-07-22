#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  lodgingInventoryHasLivePhotos,
  mergeLodgingInventoryRows,
} from "../lib/globe/context-hub/merge-lodging-inventory-rows";
import type { ContextLodgingInventoryRow } from "../lib/globe/context-hub/lodging-resource-types";

function row(
  partial: Partial<ContextLodgingInventoryRow> & Pick<ContextLodgingInventoryRow, "name">,
): ContextLodgingInventoryRow {
  return {
    placeId: partial.placeId ?? null,
    name: partial.name,
    address: null,
    lat: 34.67,
    lng: 135.5,
    images: partial.images ?? [],
    priceKrw: partial.priceKrw ?? null,
    provider: partial.provider ?? "mock",
    photoSource: partial.photoSource ?? "mock",
    photoConfidence: partial.photoConfidence ?? "mock",
    partnerLabel: null,
    ...partial,
  };
}

const lite = row({
  name: "Namba Capsule",
  placeId: "lite-1",
  images: ["https://cdn.example/lite.jpg"],
  provider: "liteapi",
  photoSource: "liteapi",
  photoConfidence: "strong_identity",
});
const places = row({
  name: "Namba Capsule",
  placeId: "lite-1",
  images: [],
  provider: "google_places",
  photoSource: "google_places_nearby",
  photoConfidence: "nearby_identity",
});
const placesExtra = row({
  name: "Nine Hours Namba",
  placeId: "g-2",
  images: ["https://cdn.example/places.jpg"],
  provider: "google_places",
  photoSource: "google_places_details",
  photoConfidence: "exact_place_id",
});

const merged = mergeLodgingInventoryRows({
  primary: [lite],
  secondary: [places, placesExtra],
  maxResults: 5,
});
assert.equal(merged.length, 2);
assert.equal(merged[0]?.images[0], "https://cdn.example/lite.jpg");
assert.ok(merged.some((item) => item.name === "Nine Hours Namba"));
assert.equal(lodgingInventoryHasLivePhotos(merged), true);
assert.equal(
  lodgingInventoryHasLivePhotos([
    row({ name: "Empty Capsule", images: [], provider: "mock" }),
  ]),
  false,
);

console.log("test-merge-lodging-inventory-rows: ok");
