#!/usr/bin/env npx tsx
/**
 * Korea national rail — catalog + lineId resolve.
 */
import assert from "node:assert/strict";
import {
  KOREA_RAIL_LINE_CATALOG,
  KOREA_RAIL_LINE_IDS,
  getKoreaRailLineEntry,
  resolveKoreaRailLineIdFromText,
} from "../lib/geo/korea-rail/line-catalog";

assert.equal(KOREA_RAIL_LINE_IDS.length, KOREA_RAIL_LINE_CATALOG.length);
assert.ok(KOREA_RAIL_LINE_IDS.length >= 10);

for (const id of KOREA_RAIL_LINE_IDS) {
  const entry = getKoreaRailLineEntry(id);
  assert.ok(entry, id);
  assert.ok(entry!.color.startsWith("#"));
  assert.ok(entry!.aliases.length >= 1);
}

assert.equal(resolveKoreaRailLineIdFromText("KTX 경부선"), "ktx_gyeongbu");
assert.equal(resolveKoreaRailLineIdFromText("SRT 보여줘"), "srt");
assert.equal(resolveKoreaRailLineIdFromText("중앙선"), "jungang");
assert.equal(resolveKoreaRailLineIdFromText("영동선 표시"), "yeongdong");
assert.equal(resolveKoreaRailLineIdFromText("hello"), null);

console.log("korea-rail-catalog: ok");
