#!/usr/bin/env npx tsx
/**
 * Search Intent → Tool Registry → Graph IR + Reality Object → Globe Diff markers.
 * Capsule/price Field refine still defers to scout (no Graph steal).
 */

import assert from "node:assert/strict";
import {
  clearSessionGraphs,
  fieldScoutOwnsLodgingGraphMarkers,
  isToolSearchLastBatch,
  projectSessionGraphToBrainCandidates,
  resetGraphCommandStoreForTests,
  shouldDeferSearchProjectToDiscoveryScout,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
import { clearContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import { readContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import {
  assertNlPipelineStageOrder,
  runNaturalLanguagePipeline,
} from "../lib/context-run/run-natural-language-pipeline";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { resolveLookupToolId } from "../lib/rule-engine/resolve-tool-id";

assert.equal(resolveLookupToolId("lodging"), "hotel.lookup");
assert.equal(resolveLookupToolId("eatery"), "restaurant.lookup");
assert.equal(resolveLookupToolId("poi"), "maps.search");

{
  resetGraphCommandStoreForTests();
  clearPreparedRealityOperations();
  clearSessionGraphs();
  clearContextConditionLastBatch("evt-search-diff");

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
  assert.ok(applied!.graph.nodes.length >= 1);
  assert.ok(applied!.commands.some((c) => c.op === "search_project"));

  const lodgingNodes = applied!.graph.nodes.filter((n) => n.kind === "lodging");
  assert.ok(lodgingNodes.length >= 1);
  for (const node of lodgingNodes) {
    assert.ok(
      typeof node.attrs.realityObjectId === "string" &&
        node.attrs.realityObjectId.trim(),
      `missing realityObjectId on ${node.labelKo}`,
    );
  }

  const batch = readContextConditionLastBatch("evt-search-diff");
  assert.ok(batch);
  assert.ok((batch!.recommendations?.length ?? 0) >= 1);
  assert.ok(isToolSearchLastBatch(batch));
  assert.equal(batch!.triggerMessage, "APA호텔 찾아줘");
  assert.equal(fieldScoutOwnsLodgingGraphMarkers(batch), false);

  const markers = projectSessionGraphToBrainCandidates(applied!.graph);
  const lodgingMarkers = markers.filter((m) => m.family === "lodging");
  assert.ok(lodgingMarkers.length >= 1, "tool Diff must keep lodging markers");
  assert.ok(lodgingMarkers.every((m) => m.markerStyle === "dashed"));
  assert.ok(lodgingMarkers.every((m) => m.sourceGuideNodeId));
}

{
  resetGraphCommandStoreForTests();
  clearPreparedRealityOperations();
  clearSessionGraphs();
  clearContextConditionLastBatch("evt-search-nl");

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

  const batch = readContextConditionLastBatch("evt-search-nl");
  assert.ok(batch);
  assert.ok((batch!.recommendations?.length ?? 0) >= 1);
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
