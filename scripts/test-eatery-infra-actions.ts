#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildEateryInfraActions,
  buildUberRideHref,
  buildUberRideWebHref,
  resolveEateryInfraRegion,
} from "../lib/globe/eatery/eatery-infra-actions";

const seoul = {
  name: "을지로 국밥집",
  address: "서울 중구 을지로 10",
  lat: 37.5665,
  lng: 126.978,
  mapsUrl: "https://map.naver.com/p/search/%EC%9D%84%EC%A7%80%EB%A1%9C%20%EA%B5%AD%EB%B0%A5%EC%A7%91",
  contextPlace: "서울",
  contextTitle: "출장 저녁",
};

const osaka = {
  name: "난바 오코노미야키",
  address: "Namba, Osaka",
  lat: 34.667,
  lng: 135.501,
  mapsUrl: "https://www.google.com/maps/place/?q=place_id:abc123",
  contextPlace: "오사카",
  contextTitle: "오사카 여행",
};

assert.equal(resolveEateryInfraRegion(seoul), "kr");
assert.equal(resolveEateryInfraRegion(osaka), "jp");

const krActions = buildEateryInfraActions(seoul);
assert.equal(krActions[0]?.label, "카카오맵");
assert.match(krActions[0]?.href ?? "", /^kakaomap:\/\/look\?p=37.5665,126.978$/);
assert.match(krActions[0]?.fallbackHref ?? "", /map\.kakao\.com\/link\/map\//);
assert.equal(krActions[1]?.label, "카카오T");
assert.match(krActions[1]?.href ?? "", /taxi\.kakao\.com/);

const jpActions = buildEateryInfraActions(osaka);
assert.equal(jpActions[0]?.label, "Google Maps");
assert.match(jpActions[0]?.href ?? "", /google\.com\/maps\/dir/);
assert.equal(jpActions[1]?.label, "Uber");
assert.match(jpActions[1]?.href ?? "", /^uber:\/\//);
assert.match(jpActions[1]?.fallbackHref ?? "", /m\.uber\.com\/ul/);

assert.match(buildUberRideHref(osaka), /dropoff%5Blatitude%5D=34.667/);
assert.match(buildUberRideWebHref(osaka), /dropoff%5Bnickname%5D=/);

console.log("test-eatery-infra-actions: ok");
