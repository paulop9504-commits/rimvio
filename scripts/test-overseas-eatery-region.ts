#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildCanonicalPlaceProfile } from "../lib/globe/canonical-place-profile";
import { resolveEateryMockNearOrigin } from "../lib/globe/eatery/resolve-eatery-mock-inventory";
import {
  inferMapRegionBias,
  isCoordInJapan,
  isCoordInKorea,
} from "../lib/globe/infer-area-curiosity-hook";

const SETAGAYA = { lat: 35.646, lng: 139.653 };

assert.equal(
  inferMapRegionBias({
    lat: SETAGAYA.lat,
    lng: SETAGAYA.lng,
    areaLabel: "대전 출발 도쿄 여행",
  }),
  "jp",
  "Setagaya coords should win over Korean departure text",
);

assert.ok(isCoordInJapan(SETAGAYA.lat, SETAGAYA.lng));
assert.ok(!isCoordInKorea(SETAGAYA.lat, SETAGAYA.lng));

const setagayaMock = resolveEateryMockNearOrigin({
  lat: SETAGAYA.lat,
  lng: SETAGAYA.lng,
  anchorLabel: "인천 출발 도쿄",
});
assert.equal(setagayaMock.length, 0, "overseas coords must not fall back to KR mock eateries");

const seoulMock = resolveEateryMockNearOrigin({
  lat: 37.5665,
  lng: 126.978,
  anchorLabel: "도쿄 여행 준비",
});
assert.ok(seoulMock.length > 0, "Korea coords may still use local mock fallback");
assert.ok(
  seoulMock.every((row) => row.provider === "mock" && !/mock-jp/u.test(row.placeId)),
  "Seoul mock should stay on KR seed data",
);

const setagayaProfile = buildCanonicalPlaceProfile({
  lat: SETAGAYA.lat,
  lng: SETAGAYA.lng,
  label: "세타가야",
  formattedAddress: "Setagaya City, Tokyo, Japan",
  anchorSource: "event_pin",
  confidence: 0.9,
});
assert.equal(setagayaProfile.countryCode, "JP");
assert.equal(setagayaProfile.searchHints.providerBias, "google_places");

console.log("test-overseas-eatery-region: ok");
