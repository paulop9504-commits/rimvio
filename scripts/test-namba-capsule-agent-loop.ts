/**
 * 「오사카 난바역 근처 캡슐호텔로 찾아줘」 must leave lodging candidates
 * (not city/pref POI + empty list).
 * Run: npx tsx scripts/test-namba-capsule-agent-loop.ts
 */
import assert from "node:assert/strict";
import { readContextWorkspace } from "@/lib/context-workspace";
import { resolveRealityAnchorFromUtterance } from "@/lib/context-workspace/reality-anchor/resolve-anchor-from-utterance";
import { applyGlobeWorkspaceAgentTurn } from "@/lib/context-run/apply-globe-workspace-agent-turn";
import { runPlaceSearch } from "@/lib/search-engine/run-place-search";

const U = "오사카 난바역 근처 캡슐호텔로 찾아줘";

{
  const anchor = resolveRealityAnchorFromUtterance(U);
  assert.ok(anchor, "anchor required");
  assert.match(anchor!.labelKo, /난바/);
  assert.equal(anchor!.kind, "station");
  assert.ok(!/오사카부/.test(anchor!.labelKo));
}

{
  const hits = runPlaceSearch({
    query: U,
    domain: "lodging",
    allowSeedFallback: false,
    anchorLat: 34.66611,
    anchorLng: 135.50056,
    limit: 6,
  });
  assert.ok(hits.length >= 3, `soft capsule inventory, got ${hits.length}`);
  assert.ok(hits.some((h) => /캡슐|capsule/iu.test(h.labelKo)));
}

void (async () => {
  const result = await applyGlobeWorkspaceAgentTurn({
    utterance: U,
    explicitContextEventId: null,
    contextEventId: null,
  });
  assert.equal(result.handled, true);
  const ctx = result.contextEventId;
  assert.ok(ctx);
  const ws = readContextWorkspace(ctx!);
  assert.ok(ws);
  const lodging = ws!.nodes.filter((n) => n.visible && n.kind === "lodging");
  assert.ok(
    lodging.length >= 3,
    `expected ≥3 capsule lodging, got ${lodging.length}: ${lodging
      .map((n) => n.title)
      .join(", ")}`,
  );
  assert.ok(lodging.some((n) => /캡슐|capsule/iu.test(n.title)));
  const badPref = ws!.nodes.filter(
    (n) => n.visible && /오사카부|大阪[府都]/.test(n.title),
  );
  assert.equal(badPref.length, 0, "prefecture POI must not stay visible");
  console.log(
    `ok — namba capsule agent loop (${lodging.length} lodging)`,
  );
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
