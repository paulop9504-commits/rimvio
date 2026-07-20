#!/usr/bin/env npx tsx
/**
 * Cursor OS Spine SSOT — four locked axes must stay wired.
 */

import assert from "node:assert/strict";
import {
  CURSOR_OS_SPINE_AXES,
  CURSOR_OS_SPINE_LAW,
  CURSOR_OS_SPINE_VERSION,
  SEARCH_DIFF_STAGE_ORDER,
  SPINE_FIELD_COMMIT_INTENTS,
  SPINE_PREPARE_ONLY_TOOL_IDS,
  SPINE_SOFT_CONFIRM_INTENTS,
  assertSearchDiffStageOrder,
  spineUsesCanonicalNlStages,
} from "../lib/context-run/cursor-os-spine";
import {
  COMMIT_REQUIRED_INTENTS,
  SOFT_CONFIRM_INTENTS,
  resolveToolIdForIntent,
} from "../lib/rule-engine";
import { NL_PIPELINE_STAGES } from "../lib/context-run/natural-language-pipeline";

assert.equal(CURSOR_OS_SPINE_VERSION, 1);
assert.ok(CURSOR_OS_SPINE_LAW.includes("Graph Diff"));
assert.equal(CURSOR_OS_SPINE_AXES.length, 4);
assert.deepEqual(
  [...SEARCH_DIFF_STAGE_ORDER],
  ["tool_router", "graph_command_ir", "graph_engine"],
);

{
  const ids = CURSOR_OS_SPINE_AXES.map((a) => a.id);
  assert.deepEqual(ids, [
    "intent_tool_router",
    "tool_to_graph_diff",
    "stage_order",
    "approval_surface",
  ]);
  for (const axis of CURSOR_OS_SPINE_AXES) {
    assert.ok(axis.wires.length >= 1, axis.id);
    assert.ok(axis.summaryKo.length > 0, axis.id);
  }
}

assert.equal(spineUsesCanonicalNlStages(), true);
assert.ok(NL_PIPELINE_STAGES.indexOf("tool_router") < NL_PIPELINE_STAGES.indexOf("graph_command_ir"));
assert.ok(
  NL_PIPELINE_STAGES.indexOf("graph_command_ir") <
    NL_PIPELINE_STAGES.indexOf("graph_engine"),
);

assert.equal(
  assertSearchDiffStageOrder([
    "context_builder",
    "tool_router",
    "graph_command_ir",
    "graph_engine",
  ]),
  true,
);
assert.equal(
  assertSearchDiffStageOrder(["graph_engine", "tool_router"]),
  false,
);

assert.deepEqual(
  [...SPINE_FIELD_COMMIT_INTENTS].sort(),
  [...COMMIT_REQUIRED_INTENTS].sort(),
);
assert.ok(SPINE_FIELD_COMMIT_INTENTS.has("Reserve"));
assert.ok(SPINE_FIELD_COMMIT_INTENTS.has("Purchase"));
assert.ok(!SPINE_FIELD_COMMIT_INTENTS.has("Delete"));
assert.ok(SPINE_SOFT_CONFIRM_INTENTS.has("Filter"));
assert.ok(SPINE_SOFT_CONFIRM_INTENTS.has("Revise"));
assert.deepEqual(
  [...SPINE_SOFT_CONFIRM_INTENTS].sort(),
  [...SOFT_CONFIRM_INTENTS].sort(),
);

assert.equal(resolveToolIdForIntent({ intent: "Revise" }), null);
assert.equal(resolveToolIdForIntent({ intent: "Search", domain: "lodging" }), "hotel.lookup");
assert.deepEqual([...SPINE_PREPARE_ONLY_TOOL_IDS], ["booking.prepare"]);

console.log("ok — cursor-os-spine");
