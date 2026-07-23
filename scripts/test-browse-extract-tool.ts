#!/usr/bin/env npx tsx
/**
 * browse.extract Tool — allowlisted seed browse → Diff candidates (prepare-only).
 */

import assert from "node:assert/strict";
import {
  clearSessionGraphs,
  parseGraphCommands,
  readSessionGraph,
  resetGraphCommandStoreForTests,
  tryRunGraphCommandOs,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";
import { readContextConditionLastBatch } from "../lib/globe/context-condition-ai/context-condition-last-batch-store";
import { resolveLookupToolId, resolveToolIdForIntent } from "../lib/rule-engine/resolve-tool-id";
import {
  draftShortToolPlan,
  shouldDraftShortToolPlan,
} from "../lib/action-planner";
import {
  getRimvioTool,
  invokeRimvioTool,
  isBrowseExtractQuery,
  runBrowseExtract,
} from "../lib/tool-registry";

assert.equal(getRimvioTool("browse.extract")?.labelKo, "사이트 브라우징");
assert.equal(isBrowseExtractQuery("유니버셜 입장권 찾아줘"), true);
assert.equal(isBrowseExtractQuery("APA호텔 찾아줘"), false);

assert.equal(
  resolveToolIdForIntent({
    intent: "Search",
    query: "USJ 티켓 얼마야",
  }),
  "browse.extract",
);
assert.equal(resolveLookupToolId("poi", "유니버설 입장권"), "browse.extract");

{
  const extracted = runBrowseExtract({ query: "유니버셜 스튜디오 입장권" });
  assert.ok(extracted.offers.length >= 2);
  assert.equal(extracted.via, "seed");
  assert.ok(extracted.host?.includes("usj"));
}

{
  const result = invokeRimvioTool("browse.extract", {
    query: "유니버셜 입장권",
    domain: "poi",
  });
  assert.equal(result.toolId, "browse.extract");
  assert.ok((result.candidates?.length ?? 0) >= 2);
  assert.equal(result.meta?.prepareOnly, true);
  assert.ok(result.candidates?.[0]?.amountLabel);
}

assert.equal(shouldDraftShortToolPlan("유니버셜 입장권 찾아줘"), true);
{
  const plan = draftShortToolPlan({
    utterance: "유니버셜 입장권 찾아줘",
    contextEventId: "ctx-browse-plan",
  });
  assert.ok(plan);
  assert.ok(plan!.steps.some((s) => s.toolId === "browse.extract"));
}

resetGraphCommandStoreForTests();
clearPreparedRealityOperations();
clearSessionGraphs();

{
  const cmds = parseGraphCommands("유니버셜 입장권 찾아줘");
  assert.equal(cmds[0]?.op, "search_project");
  const applied = tryRunGraphCommandOs({
    utterance: "유니버셜 입장권 찾아줘",
    contextEventId: "ctx-browse-diff",
    anchorLat: 34.6654,
    anchorLng: 135.4323,
    contextLabelKo: "오사카",
  });
  assert.ok(applied);
  const graph = readSessionGraph("ctx-browse-diff");
  assert.ok(graph?.nodes.some((n) => n.kind === "poi"));
  const batch = readContextConditionLastBatch("ctx-browse-diff");
  assert.ok(batch && batch.count > 0);
}

console.log("test-browse-extract-tool: ok");
