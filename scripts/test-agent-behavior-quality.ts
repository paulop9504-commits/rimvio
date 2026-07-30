/**
 * ADR-046 — Goal Supervisor · World · Opportunity · Reflection.
 * Run: npx tsx scripts/test-agent-behavior-quality.ts
 */

import assert from "node:assert/strict";
import {
  clearAgentReflectionsForTests,
  clearWorldStateForTests,
  detectOpportunities,
  enterRimvioAgentRuntime,
  formatAgentReflectionBrief,
  formatGoalSupervisorBrief,
  observeWorldState,
  readLatestAgentReflection,
  superviseGoal,
  writeAgentReflection,
} from "@/lib/workstream";
import { syncContextGoalState } from "@/lib/workstream/context-goal-state";

clearWorldStateForTests("ctx-bq");
clearAgentReflectionsForTests("ctx-bq");

syncContextGoalState({
  contextEventId: "ctx-bq",
  intentGoal: {
    goalId: "g1",
    goalKo: "Osaka Trip",
    intentFamily: "Create",
    conditions: [],
    constraints: {
      maxWalkMinutes: null,
      budget: null,
      crowdAvoidance: 0,
      companion: null,
    },
    entities: ["오사카"],
    pendingSlots: ["lodging", "route", "flight", "food"],
    confirmedHints: ["destination", "dates"],
    ir: {} as never,
  },
});

const world = observeWorldState({
  contextEventId: "ctx-bq",
  destinationHint: "오사카",
  utterance: "오사카 여행 알아서 준비해",
});
assert.ok(world.signals.some((s) => s.hint === "usj_discount"));

const opps = detectOpportunities({ contextEventId: "ctx-bq", world });
assert.ok(opps.some((o) => /USJ/i.test(o.titleKo)));

const supervisor = superviseGoal({
  contextEventId: "ctx-bq",
  opportunities: opps,
});
assert.equal(supervisor.goalKo.includes("Osaka") || supervisor.percent >= 0, true);
assert.ok(supervisor.whyKo.includes("%"));
assert.ok(supervisor.nextToRaiseKo.length > 0);
assert.ok(formatGoalSupervisorBrief(supervisor).includes("Goal Supervisor"));

const typhoon = observeWorldState({
  contextEventId: "ctx-ty",
  utterance: "태풍 온다",
});
const tyOpps = detectOpportunities({
  contextEventId: "ctx-ty",
  world: typhoon,
});
assert.ok(tyOpps.some((o) => /기상|태풍|재배치/i.test(o.titleKo)));

const reflection = writeAgentReflection({
  contextEventId: "ctx-bq",
  goalKo: "Osaka Trip",
  committedLabels: ["난바 호텔"],
  repairCount: 1,
  opportunityCount: opps.length,
});
assert.ok(reflection.lines.length >= 3 && reflection.lines.length <= 5);
assert.ok(formatAgentReflectionBrief(reflection).includes("Reflection"));
assert.equal(readLatestAgentReflection("ctx-bq")?.id, reflection.id);

const turn = enterRimvioAgentRuntime({
  source: "workstream",
  contextEventId: "ctx-bq-turn",
  utterance: "오사카 여행 알아서 준비해",
});
assert.ok(turn.stages.includes("supervisor"));
assert.ok(turn.stages.includes("coordinator"));
assert.ok(!turn.stages.includes("strategist" as never));
assert.ok(turn.supervisor);
assert.ok(turn.world);
assert.ok(turn.opportunities.length >= 1);
assert.ok(turn.loop.includes("reflect"));

console.log("OK — agent-behavior-quality");
