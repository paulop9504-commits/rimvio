#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  OSAKA_METRO_LINE_CATALOG,
  OSAKA_METRO_LINE_IDS,
  getOsakaMetroLineEntry,
  resolveOsakaMetroLineIdFromText,
} from "@/lib/geo/osaka-metro/line-catalog";

assert.equal(OSAKA_METRO_LINE_IDS.length, 10);
assert.equal(OSAKA_METRO_LINE_CATALOG.length, 10);

const m = getOsakaMetroLineEntry("midosuji")!;
assert.equal(m.color, "#E60012");
assert.equal(m.labelKo, "미도스지선");
assert.equal(m.shortLabelKo, "미도스지");
assert.ok(Array.isArray(m.labelAnchor) && m.labelAnchor.length === 2);
assert.equal(resolveOsakaMetroLineIdFromText("미도스지선 표시해줘"), "midosuji");
assert.equal(resolveOsakaMetroLineIdFromText("御堂筋線"), "midosuji");
assert.equal(resolveOsakaMetroLineIdFromText("다니마치선"), "tanimachi");
assert.equal(resolveOsakaMetroLineIdFromText(" unrelated hotel "), null);
assert.equal(
  resolveOsakaMetroLineIdFromText("JR유메사키선"),
  "jr_yumesaki",
);
assert.equal(
  resolveOsakaMetroLineIdFromText("유니버설시티"),
  "jr_yumesaki",
);

const yume = getOsakaMetroLineEntry("jr_yumesaki")!;
assert.equal(yume.shortLabelKo, "JR유메사키");
assert.equal(yume.color, "#1A6BB5");

console.log("ok — osaka metro catalog");
