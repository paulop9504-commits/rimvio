/**
 * Short 「지하철 노선」→ map absorb + soft chips.
 * Run: npx tsx scripts/test-metro-absorb-short-nl.ts
 */

import assert from "node:assert/strict";
import { tryApplyNetworkAbsorbWorkspaceTurn } from "@/lib/reality-provider/apply-network-absorb-workspace-turn";
import { getNetworkAbsorbVisibleLineIds } from "@/lib/reality-provider/network-absorb-projection-store";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const short = tryApplyNetworkAbsorbWorkspaceTurn({
  utterance: "지하철 노선",
  contextEventId: null,
});
assert.ok(short?.handled);
assert.match(short!.replyKo, /메트로|노선/);
assert.ok(short!.softChips.length >= 2);
assert.ok(short!.softChips.some((c) => /숨기|미도스지|동선/u.test(c.labelKo)));

const bare = tryApplyNetworkAbsorbWorkspaceTurn({
  utterance: "지하철",
  contextEventId: null,
});
assert.ok(bare?.handled, "bare 「지하철」 must absorb");

const ids = getNetworkAbsorbVisibleLineIds("osaka_metro");
assert.ok(ids.length >= 5, `expected metro lines, got ${ids.length}`);

const mid = tryApplyNetworkAbsorbWorkspaceTurn({
  utterance: "미도스지선",
  contextEventId: null,
});
assert.ok(mid?.handled);

const lodging = readFileSync(
  join(process.cwd(), "lib/context-workspace/try-apply-workspace-lodging-turn.ts"),
  "utf8",
);
assert.ok(lodging.includes("tryApplyNetworkAbsorbWorkspaceTurn"));

const dock = readFileSync(
  join(process.cwd(), "components/context-workspace/workspace-cursor-dock.tsx"),
  "utf8",
);
assert.ok(dock.includes("data-network-absorb-soft-chips"));

const map = readFileSync(
  join(process.cwd(), "components/context-workspace/workspace-map-view.tsx"),
  "utf8",
);
assert.ok(map.includes("syncOsakaMetroLines"));

console.log("OK — metro-absorb-short-nl");
