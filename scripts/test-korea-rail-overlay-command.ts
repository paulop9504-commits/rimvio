#!/usr/bin/env npx tsx
/**
 * Korea national rail — NL overlay command.
 */
import assert from "node:assert/strict";
import {
  clearKoreaRailOverlayForTests,
  getKoreaRailVisibleLineIds,
  resolveKoreaRailOverlayCommand,
  tryApplyKoreaRailOverlayFromUtterance,
} from "../lib/geo/korea-rail";
import { KOREA_RAIL_LINE_IDS } from "../lib/geo/korea-rail/line-catalog";

clearKoreaRailOverlayForTests();

assert.deepEqual(resolveKoreaRailOverlayCommand("전국 노선도"), {
  op: "show_all",
});
assert.deepEqual(resolveKoreaRailOverlayCommand("전국 노선도 깔아"), {
  op: "show_all",
});
assert.deepEqual(resolveKoreaRailOverlayCommand("한국 철도 보여줘"), {
  op: "show_all",
});
assert.deepEqual(resolveKoreaRailOverlayCommand("노선도 숨겨"), {
  op: "hide_all",
});
assert.deepEqual(resolveKoreaRailOverlayCommand("KTX 경부선 보여줘"), {
  op: "show",
  lineId: "ktx_gyeongbu",
});
assert.deepEqual(resolveKoreaRailOverlayCommand("중앙선 꺼줘"), {
  op: "hide",
  lineId: "jungang",
});

// Do not steal Osaka / unrelated
assert.equal(resolveKoreaRailOverlayCommand("미도스지선 보여줘"), null);
assert.equal(resolveKoreaRailOverlayCommand("호텔 찾아줘"), null);

const status = tryApplyKoreaRailOverlayFromUtterance("전국 노선도");
assert.equal(status, "전국 노선도 표시");
assert.equal(getKoreaRailVisibleLineIds().length, KOREA_RAIL_LINE_IDS.length);

tryApplyKoreaRailOverlayFromUtterance("전국 노선도 숨겨");
assert.equal(getKoreaRailVisibleLineIds().length, 0);

console.log("korea-rail-overlay-command: ok");
