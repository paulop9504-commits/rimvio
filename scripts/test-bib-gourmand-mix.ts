#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  BIB_GOURMAND_REASON_KO,
  bibGourmandQueryForBias,
  isBibGourmandMarked,
  mixBibGourmandIntoCandidates,
} from "../lib/restaurant-search/bib-gourmand";
import type { RestaurantSearchCandidate } from "../lib/restaurant-search/types";

function stub(
  partial: Partial<RestaurantSearchCandidate> &
    Pick<RestaurantSearchCandidate, "placeId" | "name">,
): RestaurantSearchCandidate {
  return {
    source: "google_places",
    sourceLabel: "Google Places",
    address: null,
    lat: 35.68,
    lng: 139.69,
    rating: 4.2,
    openNow: true,
    phone: null,
    mapsUrl: null,
    images: [],
    searchScore: 10,
    ...partial,
  };
}

assert.match(bibGourmandQueryForBias("jp", "신주쿠"), /ビブグルマン/);
assert.match(bibGourmandQueryForBias("kr", "성수"), /빕/);
assert.match(bibGourmandQueryForBias("global", "Tokyo"), /Bib Gourmand/);

const ranked = [
  stub({ placeId: "a", name: "일반 라멘", searchScore: 40 }),
  stub({ placeId: "b", name: "동네 덮밥", searchScore: 35 }),
  stub({ placeId: "c", name: "골목 야키토리", searchScore: 30 }),
  stub({ placeId: "d", name: "브런치 카페", searchScore: 25 }),
  stub({ placeId: "e", name: "이자카야", searchScore: 20 }),
];

const bibHits = [
  stub({
    placeId: "bib-1",
    name: "신주쿠 빕 식당",
    specialReasonKo: BIB_GOURMAND_REASON_KO,
    searchScore: 12,
  }),
  stub({
    placeId: "bib-2",
    name: "또 다른 빕",
    specialReasonKo: BIB_GOURMAND_REASON_KO,
    searchScore: 11,
  }),
];

const mixed = mixBibGourmandIntoCandidates({
  ranked,
  bibHits,
  maxResults: 5,
});

assert.equal(mixed.length, 5);
assert.equal(mixed[1]?.placeId, "bib-1", "first bib interleaves at slot 1");
assert.equal(mixed[3]?.placeId, "bib-2", "second bib interleaves at slot 3");
assert.ok(mixed.some((row) => row.specialReasonKo === BIB_GOURMAND_REASON_KO));

const upgraded = mixBibGourmandIntoCandidates({
  ranked: [
    stub({ placeId: "twin", name: "기존 맛집", searchScore: 50 }),
    stub({ placeId: "other", name: "다른 곳", searchScore: 40 }),
  ],
  bibHits: [
    stub({
      placeId: "twin-google",
      name: "기존 맛집",
      specialReasonKo: BIB_GOURMAND_REASON_KO,
      rating: 4.7,
    }),
  ],
  maxResults: 2,
});
assert.equal(upgraded.length, 2);
assert.ok(
  upgraded.some(
    (row) => row.name === "기존 맛집" && isBibGourmandMarked(row),
  ),
  "same-name ranked row gets Bib badge instead of a duplicate",
);

const emptyMix = mixBibGourmandIntoCandidates({
  ranked,
  bibHits: [],
  maxResults: 3,
});
assert.deepEqual(
  emptyMix.map((row) => row.placeId),
  ["a", "b", "c"],
  "no invent when Bib hits are empty",
);

console.log("test-bib-gourmand-mix: ok");
