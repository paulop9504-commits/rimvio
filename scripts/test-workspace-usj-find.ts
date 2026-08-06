/**
 * Workspace 「유니버셜 스튜디오 찾아」 must surface USJ (not empty / wrong Namba POIs).
 * Run: npx tsx scripts/test-workspace-usj-find.ts
 */

import assert from "node:assert/strict";
import {
  planObjectDiscovery,
  runObjectDiscovery,
} from "@/lib/context-run";
import { resolveWorkspaceMutationMode } from "@/lib/agent-policy";
import { resolveWorkspaceSearchDomain } from "@/lib/context-workspace/resolve-workspace-search-domain";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import { clearContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { searchOsakaDemoCatalog } from "@/lib/search-engine/osaka-demo-catalog";
import { resolveRealityAnchorFromUtterance } from "@/lib/context-workspace/reality-anchor/resolve-anchor-from-utterance";

const UTTER = "유니버셜 스튜디오 찾아";

assert.equal(resolveWorkspaceSearchDomain(UTTER, "lodging"), "poi");
assert.ok(resolveRealityAnchorFromUtterance(UTTER));

const mutation = resolveWorkspaceMutationMode({
  utterance: UTTER,
  hasVisibleCandidates: true,
});
assert.equal(mutation.mode, "replace");

const catalog = searchOsakaDemoCatalog({
  query: UTTER,
  domain: "poi",
  limit: 4,
  anchorLat: 34.66,
  anchorLng: 135.5,
});
assert.ok(catalog && catalog.length >= 1);
assert.ok(
  catalog!.some((h) => /유니버설|유니버셜|usj|universal/iu.test(h.labelKo)),
  "catalog must prefer USJ over generic Namba dump",
);

const ctx = "ctx-usj-find-1";
clearContextWorkspace(ctx);
openMapContextWorkspace({
  contextEventId: ctx,
  domain: "lodging",
  query: "오사카 숙소",
  summaryKo: "오사카 여행",
  candidates: [
    {
      id: "lodging:osaka:demo",
      labelKo: "데모 호텔",
      rating: 4.2,
      lat: 34.66,
      lng: 135.5,
      source: "seed",
    },
  ],
  source: "scout_patch",
});

const plan = planObjectDiscovery({
  contextEventId: ctx,
  utterance: UTTER,
  mode: "replace",
});
assert.ok(plan);
assert.equal(plan!.domain, "poi");

async function main(): Promise<void> {
  const discovered = await runObjectDiscovery(plan!);
  assert.equal(discovered.ok, true);
  assert.ok(discovered.candidates.length >= 1);
  assert.ok(
    discovered.candidates.some((c) =>
      /유니버설|유니버셜|usj|universal/iu.test(`${c.id} ${c.labelKo}`),
    ),
    `expected USJ in ${discovered.candidates.map((c) => c.labelKo).join(", ")}`,
  );

  clearContextWorkspace(ctx);
  console.log("OK — workspace-usj-find");
}

void main();