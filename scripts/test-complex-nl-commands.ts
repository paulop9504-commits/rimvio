/**
 * Complex NL — multi-domain + route compounds (Action Planner atoms).
 * Run: npx tsx scripts/test-complex-nl-commands.ts
 */

import assert from "node:assert/strict";
import {
  buildActionPlan,
  composeActionPlanFromAtoms,
  isCompoundActionUtterance,
  parseNlIntentChain,
  shouldRunMultiIntentPlanner,
} from "../lib/action-planner";
import {
  resolveCommandFirstDecision,
  shouldExecuteWithoutAsk,
} from "../lib/rimvio-command/command-first";
import { gateOperatorTurnSync } from "../lib/globe/operator-turn/gate-operator-turn";
import type { OperatorTurnSsot } from "../lib/globe/operator-turn/types";

function emptySsot(contextEventId: string): OperatorTurnSsot {
  return {
    contextEventId,
    scoutContract: null,
    selectedAnchor: null,
    lensSession: null,
    lastBatch: null,
    reelKinds: [],
    reelItemCount: 0,
    composeTail: [],
    hasActiveSpec: true,
    explorationMode: "balanced",
  };
}

const COMPLEX =
  "오사카 3박 가성비 호텔 찾고 근처 맛집도 넣고 동선 잡아줘";

assert.equal(isCompoundActionUtterance(COMPLEX), true);

const chain = parseNlIntentChain(COMPLEX);
assert.equal(shouldRunMultiIntentPlanner(chain), true);
assert.ok(chain.atoms.length >= 3, `expected ≥3 atoms, got ${chain.atoms.length}`);
const families = chain.atoms.map((a) => a.family);
assert.ok(families.includes("Search"));
assert.ok(families.includes("Navigate"), `got ${families.join(",")}`);
// 「동선 잡아」 must not be Reserve.
assert.ok(!families.includes("Reserve"));

const composed = composeActionPlanFromAtoms({
  utterance: COMPLEX,
  contextEventId: "ctx-complex-nl",
  atoms: chain.atoms,
});
assert.ok(composed);
assert.equal(composed!.planKind, "search_multi_route");
const toolIds = composed!.steps
  .filter((s) => s.kind === "tool")
  .map((s) => s.toolId);
assert.ok(toolIds.includes("hotel.lookup"));
assert.ok(toolIds.includes("restaurant.lookup"));
assert.ok(composed!.steps.some((s) => s.kind === "soft_navigate"));

const plan = buildActionPlan({
  utterance: COMPLEX,
  contextEventId: "ctx-complex-nl",
});
assert.ok(plan);
assert.equal(plan!.planKind, "search_multi_route");

// Keep lodging · replace eatery
const KEEP =
  "숙소는 그대로 두고 맛집만 더 좋은 데로 바꿔줘";
assert.equal(isCompoundActionUtterance(KEEP), true);
const keepCmd = resolveCommandFirstDecision({
  utterance: KEEP,
  activeContextId: "ctx-complex-nl",
  activeWorkspaceKind: "travel",
});
assert.equal(keepCmd.commandId, "search_eatery");
assert.ok(shouldExecuteWithoutAsk(keepCmd));

// Compound → operator graph_command (Action Planner path)
const compoundCmd = resolveCommandFirstDecision({
  utterance: COMPLEX,
  activeContextId: "ctx-complex-nl",
  activeWorkspaceKind: "travel",
});
assert.equal(compoundCmd.commandId, "compound_plan");
assert.ok(shouldExecuteWithoutAsk(compoundCmd));

const gated = gateOperatorTurnSync({
  text: COMPLEX,
  ssot: emptySsot("ctx-complex-nl"),
});
assert.equal(gated.tool, "graph_command");

// Route-only navigate cue
const routeOnly = parseNlIntentChain("동선 최적화해줘");
assert.equal(routeOnly.atoms[0]?.family, "Navigate");

// Filter + navigate still compound
assert.equal(isCompoundActionUtterance("싸게만 남기고 길 찾아줘"), true);

console.log("OK — complex-nl-commands");
