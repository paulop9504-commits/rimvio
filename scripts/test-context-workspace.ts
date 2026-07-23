/**
 * Context Workspace-first lodging loop — Phase 1 regression.
 */

import assert from "node:assert/strict";
import {
  applyWorkspaceTransition,
  clearContextWorkspace,
  commitLodgingWorkspaceToGlobe,
  estimateWorkspaceProgressPercent,
  hasProvisionalLodgingWorkspace,
  openLodgingContextWorkspace,
  parseWorkspaceUtteranceTransition,
  readContextWorkspace,
  tryApplyWorkspaceLodgingTurnSync,
} from "../lib/context-workspace";
import { readContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import {
  ensureSessionGraph,
  readSessionGraph,
  resetGraphCommandStoreForTests,
} from "../lib/graph-command/session-graph-store";
import { tryRunGraphCommandOs } from "../lib/graph-command/apply-graph-commands";
import { shouldDeferSearchProjectToDiscoveryScout } from "../lib/graph-command/should-defer-search-project-to-scout";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import {
  appendWorkspacePreviewComposeTurn,
} from "../lib/context-workspace/append-workspace-preview-turn";
import {
  clearContextAgentComposeThread,
  readContextAgentComposeThread,
} from "../lib/globe/assistant";

const EVENT_ID = "test-context-workspace-lodging";

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearContextWorkspace(EVENT_ID);

const opened = openLodgingContextWorkspace({
  contextEventId: EVENT_ID,
  query: "제주 가성비 호텔",
  hits: [
    {
      id: "maps:hotel-a",
      labelKo: "제주 오션뷰 호텔 A",
      domain: "lodging",
      lat: 33.5,
      lng: 126.5,
      rating: 4.6,
      walkMinutes: 8,
      priceBand: 2,
      reservable: true,
      localFavorite: false,
      source: "maps",
      amountLabel: "12만원",
    },
    {
      id: "maps:hotel-b",
      labelKo: "제주 시내 호텔 B",
      domain: "lodging",
      lat: 33.51,
      lng: 126.52,
      rating: 4.1,
      walkMinutes: 5,
      priceBand: 1,
      reservable: true,
      localFavorite: false,
      source: "maps",
      amountLabel: "8만원",
    },
    {
      id: "maps:hotel-c",
      labelKo: "제주 럭셔리 C",
      domain: "lodging",
      lat: 33.49,
      lng: 126.48,
      rating: 4.8,
      walkMinutes: 12,
      priceBand: 4,
      reservable: true,
      localFavorite: false,
      source: "maps",
    },
  ],
});

assert.equal(opened.status, "editing");
assert.equal(opened.nodes.length, 3);
assert.equal(hasProvisionalLodgingWorkspace(EVENT_ID), true);

assert.equal(
  shouldDeferSearchProjectToDiscoveryScout("호텔 찾아"),
  false,
);
assert.equal(
  shouldDeferSearchProjectToDiscoveryScout("제주도 가성비 호텔 찾아봐"),
  false,
);

clearContextAgentComposeThread(EVENT_ID);
appendWorkspacePreviewComposeTurn(EVENT_ID);
{
  const preview = readContextAgentComposeThread(EVENT_ID).find(
    (t) => t.role === "assistant" && t.kind === "workspace_preview",
  );
  assert.ok(preview);
  assert.ok(
    preview &&
      preview.role === "assistant" &&
      preview.kind === "workspace_preview" &&
      preview.payload.nodes.length >= 1,
  );
}

const similar = parseWorkspaceUtteranceTransition("A랑 비슷한 호텔 더 찾아");
assert.equal(similar?.op, "find_similar");
tryApplyWorkspaceLodgingTurnSync({
  utterance: "A랑 비슷한 호텔 더 찾아",
  contextEventId: EVENT_ID,
});
const afterSimilar = readContextWorkspace(EVENT_ID);
assert.ok((afterSimilar?.nodes.length ?? 0) > 3);

const ocean = parseWorkspaceUtteranceTransition("Ocean view only");
assert.equal(ocean?.op, "filter");
applyWorkspaceTransition({
  contextEventId: EVENT_ID,
  op: "filter",
  filter: { tagIncludes: ["ocean_view"] },
});
const afterOcean = readContextWorkspace(EVENT_ID);
const visibleOcean = afterOcean?.nodes.filter((n) => n.visible) ?? [];
assert.ok(visibleOcean.every((n) => n.tags.includes("ocean_view")));
assert.ok(visibleOcean.length >= 1);

const pick = visibleOcean[0]!;
applyWorkspaceTransition({
  contextEventId: EVENT_ID,
  op: "select",
  nodeIds: [pick.id],
});

const committed = commitLodgingWorkspaceToGlobe({
  contextEventId: EVENT_ID,
  nodeIds: [pick.id],
});
assert.equal(committed.ok, true);
assert.equal(committed.state?.status, "committed");
assert.equal(hasProvisionalLodgingWorkspace(EVENT_ID), false);

const batch = readContextConditionLastBatch(EVENT_ID);
assert.ok(batch?.batchId?.startsWith("workspace-commit:"));
assert.ok((batch?.recommendations?.length ?? 0) >= 1);

const graph = readSessionGraph(EVENT_ID);
assert.ok(graph?.nodes.some((n) => n.kind === "lodging"));

// Fresh lodging search opens Workspace without Globe lodging stamp.
const EVENT_B = "test-context-workspace-search-project";
clearContextWorkspace(EVENT_B);
ensureSessionGraph({
  contextEventId: EVENT_B,
  anchorLat: 33.5,
  anchorLng: 126.5,
});
const applied = tryRunGraphCommandOs({
  utterance: "APA호텔 찾아줘",
  contextEventId: EVENT_B,
  anchorLat: 34.6654,
  anchorLng: 135.5019,
  contextLabelKo: "오사카",
});
assert.ok(applied, "lodging search_project should apply");
assert.equal(hasProvisionalLodgingWorkspace(EVENT_B), true);
const graphB = readSessionGraph(EVENT_B);
assert.equal(
  graphB?.nodes.filter((n) => n.kind === "lodging").length ?? 0,
  0,
  "lodging nodes stay off Globe until Commit",
);
assert.ok(
  applied!.assistantReplyKo.includes("워크스페이스") ||
    (readContextWorkspace(EVENT_B)?.nodes.length ?? 0) > 0,
);

// Draft auto-save: NL edit bumps updatedAt; Current Context progress rises with selection.
{
  const ws = readContextWorkspace(EVENT_B);
  assert.ok(ws);
  assert.equal(ws!.status, "editing");
  const beforeIso = ws!.updatedAtIso;
  const beforeProgress = estimateWorkspaceProgressPercent(ws!);
  applyWorkspaceTransition({
    contextEventId: EVENT_B,
    op: "select",
    nodeIds: ws!.nodes[0] ? [ws!.nodes[0].id] : [],
  });
  const after = readContextWorkspace(EVENT_B);
  assert.ok(after);
  assert.ok(after!.updatedAtIso >= beforeIso);
  assert.ok(estimateWorkspaceProgressPercent(after!) >= beforeProgress);
}

clearContextWorkspace(EVENT_ID);
clearContextWorkspace(EVENT_B);

// Eatery / POI map search also opens Workspace (no Globe stamp).
const EVENT_E = "test-context-workspace-eatery";
clearContextWorkspace(EVENT_E);
ensureSessionGraph({
  contextEventId: EVENT_E,
  anchorLat: 36.35,
  anchorLng: 127.38,
});
const eateryApplied = tryRunGraphCommandOs({
  utterance: "둔산동 맛집 찾아",
  contextEventId: EVENT_E,
  anchorLat: 36.35,
  anchorLng: 127.38,
  contextLabelKo: "둔산동",
});
assert.ok(eateryApplied);
assert.equal(hasProvisionalLodgingWorkspace(EVENT_E), true);
assert.equal(readContextWorkspace(EVENT_E)?.domain, "eatery");
assert.equal(
  readSessionGraph(EVENT_E)?.nodes.filter((n) => n.kind === "eatery").length ??
    0,
  0,
);
clearContextWorkspace(EVENT_E);

console.log("ok — context workspace lodging loop");
