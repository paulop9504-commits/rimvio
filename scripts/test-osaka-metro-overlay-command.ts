#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  applyOsakaMetroOverlayCommand,
  clearOsakaMetroOverlayForTests,
  getOsakaMetroVisibleLineIds,
} from "@/lib/geo/osaka-metro/metro-overlay-store";
import {
  osakaMetroOverlayStatusKo,
  resolveOsakaMetroOverlayCommand,
} from "@/lib/geo/osaka-metro/resolve-metro-overlay-command";

clearOsakaMetroOverlayForTests();

const show = resolveOsakaMetroOverlayCommand("미도스지선 표시해줘");
assert.deepEqual(show, { op: "show", lineId: "midosuji" });
assert.match(osakaMetroOverlayStatusKo(show!), /미도스지/);

assert.deepEqual(resolveOsakaMetroOverlayCommand("미도스지선 표시"), {
  op: "show",
  lineId: "midosuji",
});
assert.deepEqual(
  resolveOsakaMetroOverlayCommand("지하철 노선 전부 표시해바"),
  { op: "show_all" },
);
assert.deepEqual(resolveOsakaMetroOverlayCommand("메트로 전부 보여줘"), {
  op: "show_all",
});

const hide = resolveOsakaMetroOverlayCommand("미도스지선 숨겨줘");
assert.deepEqual(hide, { op: "hide", lineId: "midosuji" });

assert.deepEqual(resolveOsakaMetroOverlayCommand("메트로 전부 표시"), {
  op: "show_all",
});
assert.deepEqual(resolveOsakaMetroOverlayCommand("전체 노선 숨겨"), {
  op: "hide_all",
});

// Do not steal lodging intents
assert.equal(
  resolveOsakaMetroOverlayCommand("미도스지 근처 호텔 찾아"),
  null,
);

applyOsakaMetroOverlayCommand({ op: "show", lineId: "midosuji" });
assert.deepEqual([...getOsakaMetroVisibleLineIds()], ["midosuji"]);
applyOsakaMetroOverlayCommand({ op: "show", lineId: "tanimachi" });
assert.deepEqual([...getOsakaMetroVisibleLineIds()], [
  "midosuji",
  "tanimachi",
]);
applyOsakaMetroOverlayCommand({ op: "hide", lineId: "midosuji" });
assert.deepEqual([...getOsakaMetroVisibleLineIds()], ["tanimachi"]);
applyOsakaMetroOverlayCommand({ op: "hide_all" });
assert.deepEqual([...getOsakaMetroVisibleLineIds()], []);

console.log("ok — osaka metro overlay command");
