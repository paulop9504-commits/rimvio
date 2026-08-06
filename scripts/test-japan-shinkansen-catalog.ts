#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  JAPAN_SHINKANSEN_LINE_CATALOG,
  JAPAN_SHINKANSEN_LINE_IDS,
  getJapanShinkansenLineEntry,
  resolveJapanShinkansenLineIdFromText,
} from "@/lib/geo/japan-shinkansen/line-catalog";

assert.equal(JAPAN_SHINKANSEN_LINE_IDS.length, 10);
assert.equal(JAPAN_SHINKANSEN_LINE_CATALOG.length, 10);

const t = getJapanShinkansenLineEntry("tokaido")!;
assert.equal(t.shortLabelKo, "도카이도");
assert.equal(t.color, "#0067C0");
assert.equal(resolveJapanShinkansenLineIdFromText("도카이도신칸센"), "tokaido");
assert.equal(resolveJapanShinkansenLineIdFromText("산요신칸센"), "sanyo");
assert.equal(resolveJapanShinkansenLineIdFromText("tohoku shinkansen"), "tohoku");
assert.equal(resolveJapanShinkansenLineIdFromText(" unrelated hotel "), null);

console.log("ok — japan shinkansen catalog");
