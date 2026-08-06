#!/usr/bin/env npx tsx
/**
 * Reality Provider Runtime — Need + Provider Resolution (ADR-051).
 */
import assert from "node:assert/strict";
import {
  resolveRealityNeedFromUtterance,
  resolveRealityProvider,
} from "@/lib/reality-provider";

const jr = resolveRealityNeedFromUtterance("오사카 JR 노선 보여줘");
assert.ok(jr);
assert.equal(jr.needId, "rail_network");
assert.equal(jr.regionKo, "오사카");
assert.equal(jr.operatorHint, "jr");

const jrRes = resolveRealityProvider(jr);
assert.ok(jrRes.selected);
assert.equal(jrRes.selected.providerId, "cached_overlay");
assert.ok(jrRes.candidates.some((c) => c.providerId === "gtfs"));

const metro = resolveRealityNeedFromUtterance("오사카 지하철 노선 전부 표시해바");
assert.ok(metro);
assert.equal(metro.needId, "metro_network");
assert.equal(resolveRealityProvider(metro).selected?.providerId, "cached_overlay");

const shin = resolveRealityNeedFromUtterance("일본 신칸센 노선도 깔아놔");
assert.ok(shin);
assert.equal(shin.needId, "shinkansen_network");

const korea = resolveRealityNeedFromUtterance("전국 노선도 보여줘");
assert.ok(korea);
assert.equal(korea.needId, "rail_network");
assert.equal(korea.operatorHint, "korail");
assert.equal(
  resolveRealityProvider(korea).selected?.providerId,
  "cached_overlay",
);

const lodging = resolveRealityNeedFromUtterance("난바 근처 캡슐호텔 찾아줘");
assert.equal(lodging, null);

const chatOnly = resolveRealityNeedFromUtterance("지하철역에서 만나자");
assert.equal(chatOnly, null);

const geoNeed = resolveRealityProvider({
  needId: "poi_geometry",
  utterance: "오사카성 위치",
  placeQuery: "오사카성",
});
assert.equal(geoNeed.selected?.providerId, "osm");
assert.ok(geoNeed.candidates.some((c) => c.providerId === "cached_overlay"));

console.log("ok — reality-provider-resolution");
