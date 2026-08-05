#!/usr/bin/env npx tsx
/**
 * JR Reality absorb MVP — ADR-051 (cached_overlay preferred).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  clearNetworkAbsorbProjectionForTests,
  getNetworkAbsorbVisibleLineIds,
} from "@/lib/reality-provider/network-absorb-projection-store";
import {
  resolveRealityNeedFromUtterance,
  resolveRealityProvider,
  tryApplyRealityAbsorbFromUtterance,
} from "@/lib/reality-provider";
import { OSAKA_JR_LINE_IDS } from "@/lib/geo/osaka-jr";

clearNetworkAbsorbProjectionForTests();

const need = resolveRealityNeedFromUtterance("오사카 JR 노선 보여줘");
assert.ok(need);
assert.equal(need.needId, "rail_network");

const res = resolveRealityProvider(need);
assert.equal(res.selected?.providerId, "cached_overlay");

const absorb = tryApplyRealityAbsorbFromUtterance({
  utterance: "오사카 JR 노선 보여줘",
});
assert.ok(absorb?.handled);
assert.ok(absorb.statusKo.includes("JR"));
assert.equal(absorb.providerId, "cached_overlay");
assert.equal(
  getNetworkAbsorbVisibleLineIds("osaka_jr").length,
  OSAKA_JR_LINE_IDS.length,
);

const lodging = tryApplyRealityAbsorbFromUtterance({
  utterance: "난바 근처 호텔 찾아줘",
});
assert.equal(lodging, null);

const geo = JSON.parse(
  readFileSync(join(process.cwd(), "public/geo/osaka_jr.geojson"), "utf8"),
) as { features: Array<{ properties?: { lineId?: string } }> };
assert.ok(geo.features.length >= 6);

const agent = readFileSync(
  join(process.cwd(), "lib/context-run/apply-globe-workspace-agent-turn.ts"),
  "utf8",
);
assert.ok(agent.includes("tryApplyNetworkAbsorbWorkspaceTurn"));
assert.ok(!agent.includes("tryApplyOsakaMetroOverlayFromUtterance"));

console.log("ok — jr-reality-absorb");
