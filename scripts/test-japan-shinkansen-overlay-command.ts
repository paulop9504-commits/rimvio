#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  applyJapanShinkansenOverlayCommand,
  clearJapanShinkansenOverlayForTests,
  getJapanShinkansenVisibleLineIds,
} from "@/lib/geo/japan-shinkansen/shinkansen-overlay-store";
import {
  japanShinkansenOverlayStatusKo,
  resolveJapanShinkansenOverlayCommand,
} from "@/lib/geo/japan-shinkansen/resolve-shinkansen-overlay-command";

clearJapanShinkansenOverlayForTests();

assert.deepEqual(
  resolveJapanShinkansenOverlayCommand("일본 신칸센 노선도 깔아놔"),
  { op: "show_all" },
);
assert.deepEqual(resolveJapanShinkansenOverlayCommand("신칸센 노선 표시"), {
  op: "show_all",
});
assert.deepEqual(
  resolveJapanShinkansenOverlayCommand("도카이도신칸센 보여줘"),
  { op: "show", lineId: "tokaido" },
);
assert.match(
  japanShinkansenOverlayStatusKo({ op: "show", lineId: "tokaido" }),
  /도카이도/,
);

assert.equal(
  resolveJapanShinkansenOverlayCommand("오사카 호텔 찾아줘"),
  null,
);

applyJapanShinkansenOverlayCommand({ op: "show_all" });
assert.equal(getJapanShinkansenVisibleLineIds().length, 10);
applyJapanShinkansenOverlayCommand({ op: "hide_all" });
assert.deepEqual([...getJapanShinkansenVisibleLineIds()], []);

console.log("ok — japan shinkansen overlay command");
