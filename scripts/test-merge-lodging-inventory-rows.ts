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
    placeId: partial.placeId ?? "unknown",
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

{
  /** STEP4 field-merge: LiteAPI price/offers + Places photos across placeId mismatch. */
  const liteField = row({
    name: "Nine Hours Namba Station",
    placeId: "liteapi:nh-1",
    lat: 34.665,
    lng: 135.501,
    images: [],
    priceKrw: 78_000,
    provider: "liteapi",
    photoSource: "liteapi",
    photoConfidence: "strong_identity",
    roomOffers: [
      {
        id: "offer-1",
        title: "Capsule",
        occupancyLabelKo: "1인",
        priceKrw: 78_000,
        totalPriceKrw: 78_000,
        refundable: false,
        roomCount: 1,
        guestCount: 1,
        sourceLabelKo: "LiteAPI",
        providerOfferId: "off-1",
      },
    ],
    liteapiHotelId: "nh-1",
  });
  const placesField = row({
    name: "Nine Hours Namba Station",
    placeId: "ChIJ_places_nh",
    lat: 34.6651,
    lng: 135.5012,
    images: [
      "https://cdn.example/places-nh.jpg",
      "https://cdn.example/places-nh-2.jpg",
    ],
    priceKrw: null,
    provider: "google_places",
    photoSource: "google_places_details",
    photoConfidence: "exact_place_id",
  });
  const fused = mergeLodgingInventoryRows({
    primary: [liteField],
    secondary: [placesField],
    maxResults: 3,
  });
  assert.equal(fused.length, 1);
  assert.equal(fused[0]?.provider, "liteapi");
  assert.equal(fused[0]?.priceKrw, 78_000);
  assert.equal(fused[0]?.roomOffers?.[0]?.providerOfferId, "off-1");
  assert.equal(fused[0]?.images[0], "https://cdn.example/places-nh.jpg");
  assert.equal(fused[0]?.images.length, 2);
}

console.log("test-merge-lodging-inventory-rows: ok");
