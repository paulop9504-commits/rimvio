/**
 * Search Intent → Tool Registry → Context Workspace (lodging) → Commit → Globe Diff.
 * Capsule/price Field refine still defers to scout (no Graph steal).
 */

import assert from "node:assert/strict";
import {
  clearSessionGraphs,
  fieldScoutOwnsLodgingGraphMarkers,
  projectSessionGraphToBrainCandidates,
  resetGraphCommandStoreForTests,
  shouldDeferSearchProjectToDiscoveryScout,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
import { readSessionGraph } from "../lib/graph-command/session-graph-store";
import { clearContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import { readContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import {
  assertNlPipelineStageOrder,
  runNaturalLanguagePipeline,
} from "../lib/context-run/run-natural-language-pipeline";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { resolveLookupToolId } from "../lib/rule-engine/resolve-tool-id";
import {
  clearContextWorkspace,
  commitLodgingWorkspaceToGlobe,
  hasProvisionalLodgingWorkspace,
  readContextWorkspace,
} from "../lib/context-workspace";

assert.equal(resolveLookupToolId("lodging"), "hotel.lookup");
assert.equal(resolveLookupToolId("eatery"), "restaurant.lookup");
assert.equal(resolveLookupToolId("poi"), "maps.search");

{
  resetGraphCommandStoreForTests();
  clearPreparedRealityOperations();
  clearSessionGraphs();
  clearContextConditionLastBatch("evt-search-diff");
  clearContextWorkspace("evt-search-diff");

  assert.equal(
    shouldDeferSearchProjectToDiscoveryScout("APA호텔 찾아줘"),
    false,
  );

  const applied = tryRunGraphCommandOs({
    utterance: "APA호텔 찾아줘",
    contextEventId: "evt-search-diff",
    anchorLat: 34.6654,
    anchorLng: 135.5019,
    contextLabelKo: "오사카",
  });
  assert.ok(applied);
  assert.ok(applied!.commands.some((c) => c.op === "search_project"));
  assert.equal(hasProvisionalLodgingWorkspace("evt-search-diff"), true);
  assert.ok(
    applied!.assistantReplyKo.includes("후보") ||
      applied!.assistantReplyKo.includes("작업장") ||
      (readContextWorkspace("evt-search-diff")?.nodes.length ?? 0) > 0,
  );

  // Phase 1: lodging stays off Globe until Commit.
  const lodgingNodes = applied!.graph.nodes.filter((n) => n.kind === "lodging");
  assert.equal(lodgingNodes.length, 0);
  assert.equal(readContextConditionLastBatch("evt-search-diff"), null);

  const ws = readContextWorkspace("evt-search-diff");
  assert.ok(ws && ws.nodes.length >= 1);

  const committed = commitLodgingWorkspaceToGlobe({
    contextEventId: "evt-search-diff",
  });
  assert.equal(committed.ok, true);

  const batch = readContextConditionLastBatch("evt-search-diff");
  assert.ok(batch);
  assert.ok((batch!.recommendations?.length ?? 0) >= 1);
  assert.ok(batch!.batchId.startsWith("workspace-commit:"));
  assert.equal(fieldScoutOwnsLodgingGraphMarkers(batch), false);

  const session = readSessionGraph("evt-search-diff");
  assert.ok(session);
  const lodgingAfter = session!.nodes.filter((n) => n.kind === "lodging");
  assert.ok(lodgingAfter.length >= 1);
  const markers = projectSessionGraphToBrainCandidates(session!);
  const lodgingMarkers = markers.filter((m) => m.family === "lodging");
  assert.ok(lodgingMarkers.length >= 1, "Commit must project lodging onto Globe");
}

{
  resetGraphCommandStoreForTests();
  clearPreparedRealityOperations();
  clearSessionGraphs();
  clearContextConditionLastBatch("evt-search-nl");
  clearContextWorkspace("evt-search-nl");

  const run = runNaturalLanguagePipeline({
    utterance: "APA호텔 찾아줘",
    contextEventId: "evt-search-nl",
    anchorLat: 34.6654,
    anchorLng: 135.5019,
    contextLabelKo: "오사카",
  });
  assert.ok(run.result);
  assert.equal(run.result!.via, "graph_command");
  assert.equal(run.trace.deferredToScout, undefined);
  assert.ok(run.trace.stagesVisited.includes("tool_router"));
  assert.ok(run.trace.stagesVisited.includes("graph_engine"));
  assert.ok(assertNlPipelineStageOrder(run.trace.stagesVisited));

  assert.equal(hasProvisionalLodgingWorkspace("evt-search-nl"), true);
  assert.equal(readContextConditionLastBatch("evt-search-nl"), null);
  assert.ok((readContextWorkspace("evt-search-nl")?.nodes.length ?? 0) >= 1);
}

{
  assert.equal(
    shouldDeferSearchProjectToDiscoveryScout("캡슐호텔 2만원 이하 찾아줘"),
    true,
  );
  const deferred = runNaturalLanguagePipeline({
    utterance: "캡슐호텔 2만원 이하 찾아줘",
    contextEventId: "evt-search-defer",
  });
  assert.equal(deferred.result?.via, "scout_handoff");
  assert.equal(deferred.trace.deferredToScout, true);
  assert.ok(!deferred.trace.stagesVisited.includes("tool_router"));
}

// Field scout batch (non tool-search) still owns lodging graph markers.
{
  assert.equal(
    fieldScoutOwnsLodgingGraphMarkers({
      batchId: "scout:evt-field:1",
      count: 1,
      summaryKo: "숙소",
      atIso: new Date().toISOString(),
      recommendations: [
        { kind: "lodging", title: "캡슐", reasonKo: "추천" },
      ],
    }),
    true,
  );
}

console.log("ok — search-tool-diff");
