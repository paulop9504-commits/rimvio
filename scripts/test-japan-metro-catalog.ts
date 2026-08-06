#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  JAPAN_METRO_LINE_CATALOG,
  JAPAN_METRO_LINE_IDS,
  getJapanMetroLineEntry,
  resolveJapanMetroCityLineIds,
  resolveJapanMetroLineIdFromText,
} from "../lib/geo/japan-metro/line-catalog";

assert.equal(JAPAN_METRO_LINE_IDS.length, JAPAN_METRO_LINE_CATALOG.length);
assert.ok(JAPAN_METRO_LINE_IDS.length >= 30);

for (const id of JAPAN_METRO_LINE_IDS) {
  const e = getJapanMetroLineEntry(id);
  assert.ok(e, id);
  assert.ok(e!.color.startsWith("#"));
}

assert.equal(resolveJapanMetroLineIdFromText("긴자선"), "tokyo_ginza");
assert.equal(resolveJapanMetroLineIdFromText("오에도선"), "toei_oedo");
assert.equal(resolveJapanMetroLineIdFromText("삿포로 도호"), "sapporo_toho");

const tokyo = resolveJapanMetroCityLineIds("도쿄 지하철");
assert.ok(tokyo);
assert.ok(tokyo!.some((id) => id.startsWith("tokyo_")));
assert.ok(tokyo!.some((id) => id.startsWith("toei_")));

console.log("japan-metro-catalog: ok");
