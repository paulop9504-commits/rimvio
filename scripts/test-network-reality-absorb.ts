#!/usr/bin/env npx tsx
/**
 * Network Reality absorb — visibility SSOT + Map session Projection.
 */
import assert from "node:assert/strict";
import {
  clearNetworkAbsorbProjectionForTests,
  getNetworkAbsorbVisibleLineIds,
} from "@/lib/reality-provider/network-absorb-projection-store";
import { tryApplyRealityAbsorbFromUtterance } from "@/lib/reality-provider";

clearNetworkAbsorbProjectionForTests();

const metro = tryApplyRealityAbsorbFromUtterance({
  utterance: "오사카 지하철 노선 전부 표시해바",
});
assert.ok(metro?.handled);
assert.equal(metro.providerId, "cached_overlay");
assert.ok(getNetworkAbsorbVisibleLineIds("osaka_metro").length > 0);

const line = tryApplyRealityAbsorbFromUtterance({
  utterance: "미도스지선 표시해줘",
});
assert.ok(line?.handled);
assert.ok(getNetworkAbsorbVisibleLineIds("osaka_metro").includes("midosuji"));

const japan = tryApplyRealityAbsorbFromUtterance({
  utterance: "일본 지하철 보여줘",
});
assert.ok(japan?.handled);
assert.ok(getNetworkAbsorbVisibleLineIds("japan_metro").length > 0);

const shin = tryApplyRealityAbsorbFromUtterance({
  utterance: "일본 신칸센 노선 보여줘",
});
assert.ok(shin?.handled);
assert.ok(getNetworkAbsorbVisibleLineIds("shinkansen").length > 0);

const korea = tryApplyRealityAbsorbFromUtterance({
  utterance: "전국 노선도 보여줘",
});
assert.ok(korea?.handled);
assert.ok(getNetworkAbsorbVisibleLineIds("korea_rail").length > 0);

const hide = tryApplyRealityAbsorbFromUtterance({
  utterance: "오사카 메트로 전부 숨겨",
});
assert.ok(hide?.handled);
assert.equal(getNetworkAbsorbVisibleLineIds("osaka_metro").length, 0);

// Map must not be the SSOT owner — absorb projection holds visibility
assert.ok(
  getNetworkAbsorbVisibleLineIds("shinkansen").length > 0,
  "other families remain after metro hide",
);

console.log("ok — network-reality-absorb");
