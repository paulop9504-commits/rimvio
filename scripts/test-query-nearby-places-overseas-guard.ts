#!/usr/bin/env npx tsx
/**
 * Tokyo activity discovery must not emit Korea demo placeholders
 * (근처 관광명소 / 현재 위치 도보 …) when Google/Naver miss.
 */
import assert from "node:assert/strict";
import { queryNearbyPlaces } from "../lib/context-resolver/places/query-nearby-places";
import { isDemoPlaceInventoryRow } from "../lib/globe/place/is-demo-place-inventory-row";

const TOKYO = { lat: 35.6895, lng: 139.6917 };
const SEOUL = { lat: 37.5665, lng: 126.978 };

async function main() {
  const tokyoActivity = await queryNearbyPlaces({
    ...TOKYO,
    criteria: {
      intent: "FIND_PLACE",
      query: "도쿄 관광명소",
      category: "activity",
      cuisine_keyword: "도쿄 관광명소",
      vibe: "unknown",
      only_open_now: false,
      min_rating: 0,
      max_results: 5,
      radius_m: 5000,
    },
  });

  assert.ok(
    tokyoActivity.every((row) => !row.place_id.startsWith("mock-")),
    "Tokyo activity must never fall back to mock-* ids",
  );
  assert.ok(
    tokyoActivity.every(
      (row) =>
        !isDemoPlaceInventoryRow({
          placeId: row.place_id,
          name: row.name,
          address: row.address,
        }),
    ),
    "Tokyo activity must never include Korea demo copy",
  );
  assert.ok(
    tokyoActivity.every((row) => !/근처 관광명소|근처 공원|지역 박물관/.test(row.name)),
    "Tokyo activity must not use generic KR mock names",
  );
  assert.ok(
    tokyoActivity.every((row) => !/현재 위치 도보/.test(row.address ?? "")),
    "Tokyo activity must not use viewer-GPS walk addresses",
  );

  // Seoul demo fallback only applies when providers return nothing.
  // With Google/Naver configured this may return live rows — still no KR mock copy mix required.
  const seoulActivity = await queryNearbyPlaces({
    ...SEOUL,
    criteria: {
      intent: "FIND_PLACE",
      query: "관광명소",
      category: "activity",
      cuisine_keyword: "관광명소",
      vibe: "unknown",
      only_open_now: false,
      min_rating: 0,
      max_results: 5,
      radius_m: 3000,
    },
  });
  assert.ok(Array.isArray(seoulActivity));

  assert.equal(
    isDemoPlaceInventoryRow({
      placeId: "mock-attraction",
      name: "근처 관광명소",
      address: "현재 위치 도보 15분",
    }),
    true,
  );
  assert.equal(
    isDemoPlaceInventoryRow({
      placeId: "ChIJxx",
      name: "신주쿠 센트럴 공원 워터 스퀘어",
      address: "2 Chome-11 Nishishinjuku, Shinjuku City",
    }),
    false,
  );

  console.log("test-query-nearby-places-overseas-guard: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
