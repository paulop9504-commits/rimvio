/**
 * Reality Jump — AI itinerary entity → Globe activation.
 * Run: npx tsx scripts/test-reality-jump.ts
 */

import assert from "node:assert/strict";
import {
  extractRealityJumpTargets,
  splitTextWithRealityJumps,
} from "../lib/globe/reality-jump";

const itinerary = `오사카 4박 5일 추천 일정

DAY 1 ✈️ 간사이 국제공항 → 난바 체크인 → 도톤보리
DAY 3 🌎 유니버설 스튜디오 재팬 종일
DAY 5 🍜 쿠로몬 시장 → 간사이 공항 출발`;

const targets = extractRealityJumpTargets(itinerary);
assert.ok(targets.length >= 2, `expected ≥2 jumps, got ${targets.length}`);

const kix = targets.find(
  (t) =>
    t.placeId === "geo:jp:kix" ||
    /간사이/u.test(t.labelKo),
);
assert.ok(kix, "KIX must resolve");
assert.ok(Number.isFinite(kix!.lat) && Number.isFinite(kix!.lng));
assert.equal(kix!.jumpKind, "reality_jump");

const usj = targets.find(
  (t) =>
    t.placeId === "geo:jp:osaka:usj" ||
    /유니버설/u.test(t.labelKo),
);
assert.ok(usj, "USJ must resolve");

const parts = splitTextWithRealityJumps("✈️ 간사이 국제공항 → 난바");
assert.ok(parts.some((p) => p.type === "entity"));
assert.ok(parts.some((p) => p.type === "text"));

const entityPart = parts.find((p) => p.type === "entity");
assert.ok(entityPart && entityPart.type === "entity");
assert.equal(entityPart.target.jumpKind, "reality_jump");

console.log("OK — reality-jump", {
  count: targets.length,
  labels: targets.map((t) => t.labelKo),
});
