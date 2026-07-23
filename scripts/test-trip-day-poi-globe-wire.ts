#!/usr/bin/env npx tsx
/**
 * Phase D / M2 — trip day + POI utterance → Diff pins + MAIN on Globe projection.
 */

import assert from "node:assert/strict";
import {
  clearSessionGraphs,
  parseGraphCommands,
  parseTripDayPoiFromText,
  projectSessionGraphToBrainCandidates,
  readSessionGraph,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { readContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import { runNaturalLanguagePipeline } from "../lib/context-run/run-natural-language-pipeline";

const UTTERANCE = "4박5일 오사카 여행, 2일차 유니버셜 스튜디오";

{
  const parsed = parseTripDayPoiFromText(UTTERANCE);
  assert.ok(parsed);
  assert.equal(parsed!.planDayIndex, 2);
  assert.equal(parsed!.planNights, 4);
  assert.ok(parsed!.destinationLabelKo?.includes("오사카"));
  assert.match(parsed!.poiLabelKo, /유니버설/);
}

{
  const cmds = parseGraphCommands(UTTERANCE);
  assert.equal(cmds.length, 1);
  assert.equal(cmds[0]?.op, "search_project");
  if (cmds[0]?.op === "search_project") {
    assert.equal(cmds[0].domain, "poi");
    assert.equal(cmds[0].planDayIndex, 2);
    assert.equal(cmds[0].planNights, 4);
  }
}

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();

{
  const applied = tryRunGraphCommandOs({
    utterance: UTTERANCE,
    contextEventId: "ctx-trip-day-m2",
    anchorLat: 34.6937,
    anchorLng: 135.5023,
    contextLabelKo: "오사카",
  });
  assert.ok(applied);
  const graph = readSessionGraph("ctx-trip-day-m2");
  assert.ok(graph);
  assert.ok(
    graph!.nodes.some((n) => n.kind === "anchor"),
    "destination anchor on graph",
  );
  const poi = graph!.nodes.find((n) => n.kind === "poi");
  assert.ok(poi, "POI Diff node");
  assert.equal(poi!.attrs.planDayIndex, 2);
  assert.equal(poi!.attrs.isMain, true);
  assert.ok(poi!.lat && poi!.lng);
  assert.ok(graph!.selectionIds.includes(poi!.id));

  const brain = projectSessionGraphToBrainCandidates(graph!);
  const mainPin = brain.find(
    (c) => c.badgeLabelKo === "2일차" || c.inferenceLabelKo === "MAIN",
  );
  assert.ok(mainPin, "Globe brain marker for day/MAIN");
  assert.ok(mainPin!.lat !== 0 && mainPin!.lng !== 0);

  const batch = readContextConditionLastBatch("ctx-trip-day-m2");
  assert.ok(batch && batch.count > 0, "Diff lastBatch stamped");
}

clearSessionGraphs();
clearPreparedRealityOperations();
resetGraphCommandStoreForTests();

{
  const run = runNaturalLanguagePipeline({
    utterance: UTTERANCE,
    contextEventId: "ctx-nl-trip-day-m2",
    contextLabelKo: "오사카",
    anchorLat: 34.6937,
    anchorLng: 135.5023,
  });
  assert.ok(run.result);
  assert.ok(
    run.trace.stagesVisited.includes("graph_command_ir") ||
      run.trace.stagesVisited.includes("graph_engine"),
  );
  const graph = readSessionGraph("ctx-nl-trip-day-m2");
  assert.ok(
    graph?.nodes.some((n) => n.kind === "poi" && n.attrs.planDayIndex === 2),
    "NL path stamps day-indexed POI",
  );
}

console.log("test-trip-day-poi-globe-wire: ok");
