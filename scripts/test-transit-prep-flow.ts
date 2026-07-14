import assert from "node:assert/strict";
import { resolveEngineOperatorTurn } from "../lib/engine/resolve-engine-operator-turn";
import { resolveOperatorAskChipDomain } from "../lib/globe/operator-turn/resolve-operator-ask-chip-domain";
import { planOneShotTransitPrep } from "../lib/globe/transit-prep/plan-one-shot-transit-prep";
import { gateOperatorTurnSync } from "../lib/globe/operator-turn/gate-operator-turn";
import type { OperatorTurnSsot } from "../lib/globe/operator-turn/types";

const ssot = {
  contextEventId: "evt-transit-test",
  scoutContract: null,
  selectedAnchor: null,
  lensSession: null,
  lastBatch: null,
  reelKinds: [],
  reelItemCount: 0,
  composeTail: [],
  hasActiveSpec: false,
  explorationMode: "diffuse",
} as unknown as OperatorTurnSsot;

const ambiguous = "이동 경로 찾아줘";
const readyMsg = "인천공항까지 택시 이동 찾아줘";

assert.equal(
  resolveOperatorAskChipDomain({
    pendingTrigger: ambiguous,
    planReason: "transit_prep_gap",
  }),
  "transit_prep",
);

const ambiguousPlan = planOneShotTransitPrep({ message: ambiguous, event: null });
assert.equal(ambiguousPlan?.readyForNavigate, false);
assert.ok(ambiguousPlan?.transitGaps.includes("destination"));

const readyPlan = planOneShotTransitPrep({ message: readyMsg, event: null });
assert.equal(readyPlan?.readyForNavigate, true);
assert.equal(readyPlan?.transitState.destinationLabel, "인천공항");

const operatorGap = resolveEngineOperatorTurn({ text: ambiguous, event: null });
assert.equal(operatorGap?.tool, "ask_chips");
if (operatorGap?.tool === "ask_chips") {
  assert.equal(operatorGap.reason, "transit_prep_gap");
  assert.ok(operatorGap.chips.length > 0);
}

const operatorReady = resolveEngineOperatorTurn({ text: readyMsg, event: null });
assert.equal(operatorReady?.tool, "scout");
if (operatorReady?.tool === "scout") {
  assert.equal(operatorReady.reason, "instant_transit_navigate");
}

const gateReady = gateOperatorTurnSync({ text: readyMsg, ssot, event: null });
assert.equal(gateReady.tool, "scout");
if (gateReady.tool === "scout") {
  assert.equal(gateReady.reason, "instant_transit_navigate");
}

console.log("test-transit-prep-flow: ok");
