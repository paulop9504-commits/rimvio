/**
 * P2 — Soft refine Top-N → Compare Decision.
 * Run: npx tsx scripts/test-compare-after-refine-p2.ts
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { applyWorkspacePatch, parseWorkspacePatch } from "@/lib/context-workspace/workspace-patch";
import { tryEnterCompareDecisionAfterRefine } from "@/lib/context-workspace/projection/try-enter-compare-after-refine";
import {
  clearWorkspaceProjectionForTests,
  isCompareDecisionProjectionActive,
} from "@/lib/context-workspace/projection/compare-decision-state";
import { applyGlobeWorkspaceAgentTurn } from "@/lib/context-run/apply-globe-workspace-agent-turn";
import { publishGlobeProjectionLayerPolicy } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import { writeContextWorkspaceExpanded } from "@/lib/context-workspace/workspace-store";

const CTX = "ctx_p2_compare_refine";

function hotel(
  id: string,
  title: string,
  priceBand: number,
  rating: number,
): ContextWorkspaceNode {
  return {
    id,
    kind: "lodging",
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.665,
    lng: 135.501,
    rating,
    priceBand,
    amountLabel: `₩${priceBand * 40_000}`,
    thumbnailUrl: null,
    tags: ["stay:hotel"],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "search",
  };
}

clearContextWorkspace(CTX);
clearWorkspaceProjectionForTests();
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "lodging",
  query: "오사카 호텔",
  summaryKo: "Osaka",
  candidates: [],
});

const nodes = [
  hotel("a", "Hotel A", 4, 4.6),
  hotel("b", "Hotel B", 2, 4.5),
  hotel("c", "Hotel C", 1, 4.4),
  hotel("d", "Hotel D", 3, 4.2),
];

writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes,
  selectedIds: [],
  compareIds: [],
});
writeContextWorkspaceExpanded(CTX, true);
publishGlobeProjectionLayerPolicy({
  mode: "focus",
  activeContextEventId: CTX,
  visiblePlaceIds: [],
});

const utt = "이중에 가성비 좋은 것만 3개";
const patch = parseWorkspacePatch(utt);
assert.equal(patch?.kind, "filter_entity");

applyWorkspacePatch({
  contextEventId: CTX,
  patch: patch!,
  utterance: utt,
});

const entered = tryEnterCompareDecisionAfterRefine({
  contextEventId: CTX,
  utterance: utt,
  keepTopN: 3,
});
assert.equal(entered.entered, true);
assert.ok(entered.result?.candidateEntityIds.length === 3);
assert.equal(isCompareDecisionProjectionActive(CTX), true);

clearWorkspaceProjectionForTests();
writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes,
  selectedIds: [],
  compareIds: [],
});

void (async () => {
  const agent = await applyGlobeWorkspaceAgentTurn({
    utterance: utt,
    explicitContextEventId: CTX,
  });
  assert.equal(agent.handled, true);
  assert.equal(agent.patchKind, "filter_entity");
  assert.equal(isCompareDecisionProjectionActive(CTX), true);
  clearContextWorkspace(CTX);
  clearWorkspaceProjectionForTests();
  console.log("ok — P2 soft Top-N → Compare Decision");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
