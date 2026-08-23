#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildCanonicalPlaceProfile } from "../lib/globe/canonical-place-profile";
import {
  parseRestaurantSearchIntent,
  resolveRestaurantCountryBias,
} from "../lib/restaurant-search/search-restaurants";

const jpBias = resolveRestaurantCountryBias({
  query: "오사카 난바 근처 맛집 찾아줘",
  anchorLabel: null,
  countryBias: null,
  origin: null,
});
assert.equal(jpBias, "jp");

const krBias = resolveRestaurantCountryBias({
  query: "성수에서 조용한 맛집",
  anchorLabel: null,
  countryBias: null,
  origin: null,
});
assert.equal(krBias, "kr");

const jpBiasFromOrigin = resolveRestaurantCountryBias({
  query: "맛집 찾아줘",
  anchorLabel: "Osaka",
  countryBias: null,
  origin: { lat: 34.6937, lng: 135.5023 },
});
assert.equal(jpBiasFromOrigin, "jp");

const osakaProfile = buildCanonicalPlaceProfile({
  lat: 34.6937,
  lng: 135.5023,
  label: "오사카",
  formattedAddress: "Osaka, Japan",
  anchorSource: "explicit_destination",
  confidence: 0.99,
});
const jpBiasFromProfile = resolveRestaurantCountryBias({
  query: "맛집 찾아줘",
  anchorLabel: "서울",
  placeProfile: osakaProfile,
  countryBias: null,
  origin: { lat: 37.5665, lng: 126.978 },
});
assert.equal(
  jpBiasFromProfile,
  "jp",
  "canonical place profile should outrank stale GPS or weak anchor text",
);

const jpBiasOverSeoulGps = resolveRestaurantCountryBias({
  query: "오사카 맛집",
  anchorLabel: "오사카",
  countryBias: null,
  origin: { lat: 37.5665, lng: 126.978 },
});
assert.equal(
  jpBiasOverSeoulGps,
  "jp",
  "destination text should beat viewer GPS in Korea",
);

const parsed = parseRestaurantSearchIntent("성수에서 조용한 해산물 빼고 로컬 맛집 찾아줘");
assert.equal(parsed.vibe, "quiet");
assert.equal(parsed.localityMode, "local");
assert.ok(parsed.excludeKeywords.includes("해산물"));

const lively = parseRestaurantSearchIntent("우메다 핫플 이자카야 추천");
assert.equal(lively.localityMode, "landmark");
assert.equal(lively.cuisine, "이자카야");

console.log("test-restaurant-search-contract: ok");
