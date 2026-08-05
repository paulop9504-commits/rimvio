/**
 * 「대전 지하철」 must not paint Osaka metro or steal into lodging.
 * Run: npx tsx scripts/test-daejeon-metro-no-osaka-steal.ts
 */

import assert from "node:assert/strict";
import { resolveRealityNeedFromUtterance } from "@/lib/reality-provider/resolve-need";
import { tryApplyNetworkAbsorbWorkspaceTurn } from "@/lib/reality-provider/apply-network-absorb-workspace-turn";
import {
  clearNetworkAbsorbProjectionForTests,
  getNetworkAbsorbVisibleLineIds,
} from "@/lib/reality-provider/network-absorb-projection-store";

clearNetworkAbsorbProjectionForTests();

const need = resolveRealityNeedFromUtterance("대전 지하철 노선도 보여줘");
assert.ok(need);
assert.equal(need.needId, "metro_network");
assert.equal(need.regionKo, "대전");

const absorb = tryApplyNetworkAbsorbWorkspaceTurn({
  utterance: "대전 지하철 노선도 보여줘",
  contextEventId: null,
});
assert.ok(absorb?.handled);
assert.equal(absorb!.mapProjected, false);
assert.match(absorb!.replyKo, /대전.*도시철|아직|없어요/u);
assert.ok(!/오사카 메트로 \d/u.test(absorb!.replyKo));
assert.equal(getNetworkAbsorbVisibleLineIds("osaka_metro").length, 0);

const shortOk = tryApplyNetworkAbsorbWorkspaceTurn({
  utterance: "지하철 노선",
  contextEventId: null,
});
assert.ok(shortOk?.mapProjected);
assert.ok(shortOk!.softChips.some((c) => /미도스지|숨기|동선/u.test(c.labelKo)));

console.log("OK — daejeon-metro-no-osaka-steal");
