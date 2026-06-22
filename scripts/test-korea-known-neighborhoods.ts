#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  KOREA_KNOWN_NEIGHBORHOODS,
  matchKoreaKnownNeighborhood,
} from "../lib/globe/korea-known-neighborhoods";
import { matchKoreaKnownPlace } from "../lib/globe/korea-known-places";

function assertNear(actual: number, expected: number, delta = 0.08) {
  assert.ok(
    Math.abs(actual - expected) <= delta,
    `expected ~${expected}, got ${actual}`,
  );
}

function main() {
  const garak = matchKoreaKnownNeighborhood("서울 송파구 가락동");
  assert.ok(garak);
  assert.equal(garak!.label, "서울 송파 가락동");
  assertNear(garak!.lat, 37.495);

  const bareGarak = matchKoreaKnownNeighborhood("가락동");
  assert.ok(bareGarak);
  assert.equal(bareGarak!.label, "서울 송파 가락동");

  const songdo = matchKoreaKnownPlace("송도동");
  assert.ok(songdo);
  assert.equal(songdo!.label, "인천 연수 송도동");

  const dongtan = matchKoreaKnownPlace("동탄");
  assert.ok(dongtan);
  assert.equal(dongtan!.label, "화성 동탄동");

  const busanNam = matchKoreaKnownNeighborhood("부산 남구 대연동");
  assert.ok(busanNam);
  assert.equal(busanNam!.label, "부산 남구 대연동");

  const jungdong = matchKoreaKnownNeighborhood("중동");
  assert.equal(jungdong, null);

  const bucheonJung = matchKoreaKnownNeighborhood("부천 원미구 중동");
  assert.ok(bucheonJung);
  assert.equal(bucheonJung!.label, "부천 원미 중동");

  const sejong = matchKoreaKnownNeighborhood("세종 아름동");
  assert.ok(sejong);

  assert.ok(KOREA_KNOWN_NEIGHBORHOODS.length >= 100);

  console.log("test-korea-known-neighborhoods: ok");
}

main();
