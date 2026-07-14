import assert from "node:assert/strict";
import { resolveEngineOperatorTurn } from "../lib/engine/resolve-engine-operator-turn";
import { resolveOperatorAskChipDomain } from "../lib/globe/operator-turn/resolve-operator-ask-chip-domain";
import { planOneShotFinancePrep } from "../lib/globe/finance-prep/plan-one-shot-finance-prep";
import { gateOperatorTurnSync } from "../lib/globe/operator-turn/gate-operator-turn";
import type { OperatorTurnSsot } from "../lib/globe/operator-turn/types";

const ssot = {
  contextEventId: "evt-finance-test",
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

const ambiguous = "여행 결제 준비해";
const readyMsg = "여행 예산 프리미엄으로 결제 준비";

assert.equal(
  resolveOperatorAskChipDomain({
    pendingTrigger: ambiguous,
    planReason: "finance_prep_gap",
  }),
  "finance_prep",
);

const ambiguousPlan = planOneShotFinancePrep({ message: ambiguous, event: null });
assert.equal(ambiguousPlan?.readyForPayment, false);
assert.ok(ambiguousPlan?.financeGaps.includes("budget"));

const readyPlan = planOneShotFinancePrep({
  message: readyMsg,
  event: {
    id: "evt-finance-ready",
    title: "여행",
    datetime: "2026-07-11",
    lifecycle: "active",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    metadata: {
      contextTripBudgetBand: "premium",
      feedPlanEnabled: true,
    },
  } as never,
});
assert.equal(readyPlan?.readyForPayment, true);
assert.equal(readyPlan?.financeState.budgetBand, "premium");

const operatorGap = resolveEngineOperatorTurn({ text: ambiguous, event: null });
assert.equal(operatorGap?.tool, "ask_chips");
if (operatorGap?.tool === "ask_chips") {
  assert.equal(operatorGap.reason, "finance_prep_gap");
  assert.ok(operatorGap.chips.some((chip) => chip.gapId === "budget"));
}

const operatorReady = resolveEngineOperatorTurn({ text: readyMsg, event: readyPlan ? {
  id: "evt-finance-ready",
  title: "여행",
  datetime: "2026-07-11",
  lifecycle: "active",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: { contextTripBudgetBand: "premium" },
} as never : null });
assert.equal(operatorReady?.tool, "scout");
if (operatorReady?.tool === "scout") {
  assert.equal(operatorReady.reason, "instant_finance_payment");
}

const gateReady = gateOperatorTurnSync({
  text: readyMsg,
  ssot,
  event: {
    id: "evt-finance-ready",
    title: "여행",
    datetime: "2026-07-11",
    lifecycle: "active",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    metadata: { contextTripBudgetBand: "premium" },
  } as never,
});
assert.equal(gateReady.tool, "scout");
if (gateReady.tool === "scout") {
  assert.equal(gateReady.reason, "instant_finance_payment");
}

console.log("test-finance-prep-flow: ok");
