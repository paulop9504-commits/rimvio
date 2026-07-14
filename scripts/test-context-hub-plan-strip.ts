import assert from "node:assert/strict";
import { composeTravelTripBlueprint } from "../lib/context-blueprint/examples/travel-trip-execution-graph";
import {
  buildContextExecutionPlanFromBlueprint,
  buildContextHubPlanPreviewRows,
  formatContextExecutionPlanPreviewKo,
} from "../lib/context-execution";

const blueprint = composeTravelTripBlueprint({
  contextId: "ctx-hub-plan-ui",
  bridgeId: "bridge-hub-plan-ui",
  runtimeId: "runtime-hub-plan-ui",
  goal: "오사카 3박 4일",
});

const plan = buildContextExecutionPlanFromBlueprint({
  blueprint,
  build: { contextId: "evt-hub-plan-ui", goalKo: "오사카 3박 4일" },
});
assert.ok(plan);

const rows = buildContextHubPlanPreviewRows(plan!, 4);
assert.equal(rows.length, 4);
assert.ok(rows.every((row) => row.symbol.length > 0));
assert.ok(rows.some((row) => row.isCurrent));

const preview = formatContextExecutionPlanPreviewKo(plan!);
assert.equal(preview.split("\n").length, plan!.steps.length);

console.log("test-engine-store-ui plan preview: ok");
