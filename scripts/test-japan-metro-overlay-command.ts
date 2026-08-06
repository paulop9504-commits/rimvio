#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  clearJapanMetroOverlayForTests,
  getJapanMetroVisibleLineIds,
  resolveJapanMetroOverlayCommand,
  tryApplyJapanMetroOverlayFromUtterance,
} from "../lib/geo/japan-metro";
import { JAPAN_METRO_LINE_IDS } from "../lib/geo/japan-metro/line-catalog";

clearJapanMetroOverlayForTests();

assert.deepEqual(resolveJapanMetroOverlayCommand("일본 지하철"), {
  op: "show_all",
});
assert.deepEqual(resolveJapanMetroOverlayCommand("일본 전국 지하철 깔아"), {
  op: "show_all",
});
assert.deepEqual(resolveJapanMetroOverlayCommand("전국 지하철 보여줘"), {
  op: "show_all",
});

const tokyo = resolveJapanMetroOverlayCommand("도쿄 메트로");
assert.ok(tokyo && tokyo.op === "show_set");
if (tokyo && tokyo.op === "show_set") {
  assert.ok(tokyo.lineIds.length >= 10);
}

assert.deepEqual(resolveJapanMetroOverlayCommand("긴자선 보여줘"), {
  op: "show",
  lineId: "tokyo_ginza",
});

assert.equal(resolveJapanMetroOverlayCommand("전국 노선도"), null);
assert.equal(resolveJapanMetroOverlayCommand("호텔 찾아줘"), null);

const status = tryApplyJapanMetroOverlayFromUtterance("일본 지하철");
assert.equal(status, "일본 전국 지하철 표시");
assert.equal(getJapanMetroVisibleLineIds().length, JAPAN_METRO_LINE_IDS.length);

tryApplyJapanMetroOverlayFromUtterance("일본 지하철 숨겨");
assert.equal(getJapanMetroVisibleLineIds().length, 0);

console.log("japan-metro-overlay-command: ok");
