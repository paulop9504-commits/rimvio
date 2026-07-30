/**
 * ADR-044/045 — Judgment Chain + One Agent Runtime.
 * Run: npx tsx scripts/test-agent-judgment-chain.ts
 */

import assert from "node:assert/strict";
import {
  clearLastAgentJudgmentForTests,
  compileIntentToGoalState,
  estimateRealityCost,
  readLastAgentJudgment,
  runAgentJudgmentChain,
  selectAgentStrategy,
  spineIngressFromLegacy,
} from "@/lib/workstream";

clearLastAgentJudgmentForTests();

const lodgingOnly = runAgentJudgmentChain({
  utterance: "숙소만 찾아줘",
});
assert.equal(lodgingOnly.cost.complexity.band, "easy");
assert.equal(lodgingOnly.strategy.strategy, "quick");
assert.equal(lodgingOnly.strategy.skipFullPlanner, true);
assert.ok(lodgingOnly.cost.scope.domains.includes("lodging"));
assert.ok(lodgingOnly.cost.confidence.percent > 0);

const weather = runAgentJudgmentChain({ utterance: "오늘 비와?" });
assert.equal(weather.strategy.strategy, "lookup");

const book = runAgentJudgmentChain({ utterance: "예약해" });
assert.equal(book.strategy.strategy, "execution");
assert.equal(book.strategy.runVerificationLoop, true);

const low = runAgentJudgmentChain({
  utterance: "아마 알아서 아무거나 추천해줘?",
});
assert.ok(low.cost.confidence.forceLookup || low.strategy.strategy === "lookup");

const tripGoal = compileIntentToGoalState({
  utterance: "오사카 여행 만들어줘",
});
const trip = runAgentJudgmentChain({
  utterance: "오사카 여행 만들어줘",
  intentGoal: tripGoal,
});
assert.equal(trip.cost.complexity.band, "hard");
assert.equal(trip.strategy.strategy, "planning");
assert.equal(trip.strategy.skipFullPlanner, false);
assert.equal(trip.cost.verificationRequired, true);
assert.equal(trip.cost.userApprovalNeed, "final_commit_only");
assert.ok(trip.cost.estimatedSteps >= 8);
assert.ok(trip.briefKo.includes("Confidence"));

const mid = estimateRealityCost({
  utterance: "일정에 맛집 추가해줘",
});
const midStrategy = selectAgentStrategy(mid, "일정에 맛집 추가해줘");
assert.ok(
  mid.complexity.band === "medium" || mid.complexity.band === "easy",
);
assert.ok(
  midStrategy.strategy === "planning" ||
    midStrategy.strategy === "quick" ||
    midStrategy.strategy === "simulation",
);

const ingress = spineIngressFromLegacy({
  source: "workstream",
  contextEventId: "ctx-judgment",
  utterance: "오사카 여행 준비해줘",
});
assert.ok(ingress.judgment);
assert.ok(ingress.runtime);
assert.equal(ingress.judgment!.strategy.strategy, "planning");
assert.equal(readLastAgentJudgment()?.strategy.strategy, "planning");
assert.ok(ingress.runtime.capabilities.length > 0);
assert.ok(ingress.runtime.brain?.confidencePercent != null);

console.log("OK — agent-judgment-chain");
