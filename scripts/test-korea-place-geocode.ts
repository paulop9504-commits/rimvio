#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { extractPlaceHintFromText } from "../lib/feed/extract-place-hint-from-text";
import { resolvePlaceCoordinates } from "../lib/experience-graph/resolve-place-coordinates";
import { matchKoreaKnownPlace } from "../lib/globe/korea-known-places";
import { KOREA_SI_CITY_NAMES } from "../lib/globe/korea-known-places";
import { matchKoreaKnownPoi } from "../lib/globe/korea-known-pois";
import { normalizePlaceLabel } from "../lib/globe/normalize-place-label";

function assertNear(actual: number, expected: number, delta = 0.5) {
  assert.ok(
    Math.abs(actual - expected) <= delta,
    `expected ~${expected}, got ${actual}`,
  );
}

async function main() {
  assert.equal(normalizePlaceLabel("대전 겔러리아"), "대전 갤러리아");
  assert.equal(extractPlaceHintFromText("수원"), "수원");
  assert.equal(extractPlaceHintFromText("수원에서 만나"), "수원");
  assert.equal(extractPlaceHintFromText("대전 겔러리아"), "대전 갤러리아");
  assert.equal(extractPlaceHintFromText("대전 갤러리아에서 만나"), "대전 갤러리아");
  assert.equal(extractPlaceHintFromText("에버랜드"), "에버랜드");
  assert.equal(extractPlaceHintFromText("롯데월드"), "롯데월드");
  assert.equal(extractPlaceHintFromText("맥북 팝니다 90만원"), null);

  const suwon = matchKoreaKnownPlace("수원");
  assert.ok(suwon);
  assertNear(suwon!.lat, 37.26);
  assertNear(suwon!.lng, 127.03);

  const everland = matchKoreaKnownPoi("에버랜드");
  assert.ok(everland);
  assert.equal(everland!.label, "에버랜드");
  assertNear(everland!.lat, 37.29);

  const lotte = matchKoreaKnownPoi("롯데월드");
  assert.ok(lotte);
  assert.equal(lotte!.label, "롯데월드");
  assertNear(lotte!.lat, 37.51);

  const galleria = resolvePlaceCoordinates("대전 겔러리아");
  assert.equal(galleria.label, "갤러리아 타임월드");
  assertNear(galleria.lat, 36.35);

  const coords = resolvePlaceCoordinates("수원");
  assert.equal(coords.label, "수원");
  assertNear(coords.lat, 37.26);
  assertNear(coords.lng, 127.03);

  const bare = resolvePlaceCoordinates("광주");
  assert.equal(bare.label, "광주");
  assertNear(bare.lat, 35.16);

  const tongyeong = matchKoreaKnownPlace("통영");
  assert.ok(tongyeong);
  assert.equal(tongyeong!.label, "통영");
  assertNear(tongyeong!.lat, 34.85);
  assertNear(tongyeong!.lng, 128.43);

  const tongyeongCoords = resolvePlaceCoordinates("통영");
  assert.equal(tongyeongCoords.label, "통영");
  assertNear(tongyeongCoords.lat, 34.85);
  assertNear(tongyeongCoords.lng, 128.43);

  const gyeonggiGwangju = matchKoreaKnownPlace("경기 광주");
  assert.ok(gyeonggiGwangju);
  assert.equal(gyeonggiGwangju!.label, "경기 광주");
  assertNear(gyeonggiGwangju!.lat, 37.41);

  const missing: string[] = [];
  for (const city of KOREA_SI_CITY_NAMES) {
    const hit = matchKoreaKnownPlace(city);
    if (!hit) {
      missing.push(city);
      continue;
    }
    if (Math.abs(hit.lat - 36.5) < 0.01 && Math.abs(hit.lng - 127.8) < 0.01) {
      missing.push(`${city}(korea-center)`);
    }
  }
  assert.equal(
    missing.length,
    0,
    `missing or default coords for: ${missing.join(", ")}`,
  );
  assert.ok(KOREA_SI_CITY_NAMES.length >= 75, "at least 75 시 covered");

  console.log("test-korea-place-geocode: ok");
}

void main();
