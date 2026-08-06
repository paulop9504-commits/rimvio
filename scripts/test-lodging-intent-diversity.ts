/**
 * Lodging intent: capsule/hostel keyword + diversity + rating display scale.
 */
import assert from "node:assert/strict";
import {
  parseLodgingStayTypeFromText,
  resolveLodgingStaySearchKeyword,
} from "../lib/globe/lodging/lodging-stay-types";
import {
  filterLodgingRowsForIntent,
  lodgingRowLooksLuxury,
} from "../lib/globe/context-condition-ai/filter-lodging-for-intent";
import type { ContextLodgingInventoryRow } from "../lib/globe/context-hub/lodging-resource-types";

assert.equal(parseLodgingStayTypeFromText("캡슐호텔 찾아줘"), "capsule");
assert.equal(parseLodgingStayTypeFromText("게스트하우스만"), "guesthouse");
assert.equal(parseLodgingStayTypeFromText("료칸 찾아줘"), "ryokan");
assert.equal(parseLodgingStayTypeFromText("도쿄 호스텔"), "hostel");
assert.equal(
  resolveLodgingStaySearchKeyword({
    message: "오사카 캡슐호텔 찾아줘",
    areaHint: "오사카",
  }),
  "캡슐호텔 오사카",
);
assert.equal(
  resolveLodgingStaySearchKeyword({
    message: "료칸 추천해줘",
    areaHint: "교토",
  }),
  "료칸 교토",
);
assert.equal(
  resolveLodgingStaySearchKeyword({
    message: "게스트하우스 찾아",
    areaHint: "오사카",
  }),
  "게스트하우스 오사카",
);

const rows: ContextLodgingInventoryRow[] = [
  {
    placeId: "a",
    name: "Conrad Osaka",
    lat: 34.7,
    lng: 135.5,
    priceKrw: 900_000,
    partnerLabel: null,
    images: [],
    address: null,
    mapsUrl: null,
    provider: "liteapi",
    rating: 9.4,
    reviewCount: 100,
    videoUrl: null,
    photoSource: null,
    photoConfidence: null,
  },
  {
    placeId: "b",
    name: "Hilton Osaka",
    lat: 34.7,
    lng: 135.5,
    priceKrw: 500_000,
    partnerLabel: null,
    images: [],
    address: null,
    mapsUrl: null,
    provider: "liteapi",
    rating: 8.8,
    reviewCount: 80,
    videoUrl: null,
    photoSource: null,
    photoConfidence: null,
  },
  {
    placeId: "c",
    name: "오사카 캡슐호텔 난바",
    lat: 34.66,
    lng: 135.5,
    priceKrw: 45_000,
    partnerLabel: null,
    images: [],
    address: "難波",
    mapsUrl: null,
    provider: "google_places",
    rating: 4.2,
    reviewCount: 220,
    videoUrl: null,
    photoSource: null,
    photoConfidence: null,
  },
];

assert.ok(lodgingRowLooksLuxury(rows[0]!));
const filtered = filterLodgingRowsForIntent({
  rows,
  lodgingKind: "hostel",
  budget: "low",
  maxNightlyPriceKrw: 80_000,
  lodgingStayType: "capsule",
});
assert.ok(
  filtered.some((r) => /캡슐/u.test(r.name)),
  "capsule stay must keep capsule rows",
);
assert.ok(
  !filtered.some((r) => /Conrad|Hilton/iu.test(r.name)),
  "capsule intent must drop luxury Hilton/Conrad",
);

// Rating display: 9.4 must not become 0.5
function formatRating(rating: number): string {
  if (rating > 10) return `★ ${(rating / 20).toFixed(1)}`;
  return `★ ${rating.toFixed(1)}`;
}
assert.equal(formatRating(9.4), "★ 9.4");
assert.equal(formatRating(4.2), "★ 4.2");
assert.notEqual(formatRating(9.4), "★ 0.5");

console.log("ok lodging-intent-diversity");
