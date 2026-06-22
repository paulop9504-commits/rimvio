#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  KOREA_METRO_DISTRICTS,
  listAmbiguousDistrictCandidates,
  matchKoreaMetroDistrict,
} from "../lib/globe/korea-metro-districts";
import { matchKoreaKnownPlace } from "../lib/globe/korea-known-places";

function assertNear(actual: number, expected: number, delta = 0.5) {
  assert.ok(
    Math.abs(actual - expected) <= delta,
    `expected ~${expected}, got ${actual}`,
  );
}

function main() {
  const busanNam = matchKoreaMetroDistrict("부산 남구");
  assert.ok(busanNam);
  assert.equal(busanNam!.label, "부산 남구");
  assertNear(busanNam!.lat, 35.14);

  const daeguNam = matchKoreaMetroDistrict("대구남구");
  assert.ok(daeguNam);
  assert.equal(daeguNam!.label, "대구 남구");

  const gangnam = matchKoreaMetroDistrict("강남구");
  assert.ok(gangnam);
  assert.equal(gangnam!.label, "서울 강남구");

  const bareNam = matchKoreaMetroDistrict("남구");
  assert.equal(bareNam, null);

  const ambiguous = listAmbiguousDistrictCandidates("남구");
  assert.ok(ambiguous);
  assert.equal(ambiguous!.length, 4);
  assert.deepEqual(
    ambiguous!.map((row) => row.label).sort(),
    ["광주 남구", "대구 남구", "부산 남구", "울산 남구"].sort(),
  );

  const jungGu = listAmbiguousDistrictCandidates("중구");
  assert.ok(jungGu);
  assert.equal(jungGu!.length, 6);

  assert.equal(matchKoreaKnownPlace("남구"), null);

  const resolved = matchKoreaKnownPlace("인천 서구");
  assert.ok(resolved);
  assert.equal(resolved!.label, "인천 서구");

  assert.equal(KOREA_METRO_DISTRICTS.length, 70);

  console.log("test-korea-metro-districts: ok");
}

main();
