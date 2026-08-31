/**
 * Agent Runtime Autonomous Loop — E2E tests (P10).
 * Tests 1–7 from spec; no live LLM required for most cases.
 */

import assert from "node:assert/strict";
import {
  buildAgentTasks,
  dispatchAgentTasks,
  classifyAgentFailure,
  policyForFailure,
  evaluateGoalConvergence,
  semanticReplanFromFailure,
  createAgentExecutionContext,
  ORCHESTRATOR_LOOP_BUDGET,
} from "@/lib/agent-orchestrator";
import { decomposeGoal } from "@/lib/reality-planner/decompose-goal";
import {
  isTripPrepUtterance,
  buildTripPrepActionPlan,
} from "@/lib/action-planner/build-trip-prep-plan";
import {
  ensureSessionGraph,
  resetGraphCommandStoreForTests,
} from "@/lib/graph-command/session-graph-store";
import type { AgentObservation } from "@/lib/agent/types";
import type { PlanDAG } from "@/lib/reality-planner/types";

function obs(
  partial: Partial<AgentObservation> &
    Pick<AgentObservation, "planId" | "stepId" | "stepKind" | "success">,
): AgentObservation {
  return partial as AgentObservation;
}

async function test1TripPrepOsaka() {
  const utterance = "오사카 4박5일 여행 준비해줘";
  assert.equal(isTripPrepUtterance(utterance), true, "Test1 trip_prep utterance");

  const ctxId = "evt:test-trip-prep-1";
  resetGraphCommandStoreForTests();
  ensureSessionGraph({ contextEventId: ctxId });

  const plan = buildTripPrepActionPlan({ utterance, contextEventId: ctxId });
  assert.ok(plan, "Test1 trip_prep plan");
  assert.ok(
    plan!.steps.some((s) => s.toolId === "hotel.lookup"),
    "Test1 hotel.lookup in plan",
  );
  assert.ok(
    plan!.steps.some((s) => s.kind === "wait_commit" || s.toolId === "booking.prepare"),
    "Test1 prepare or wait_commit",
  );

  const dag = decomposeGoal({ contextEventId: ctxId, goal: utterance });
  const lodgingTasks = buildAgentTasks(
    dag.nodes.filter((n) => n.agentId === "lodging"),
    ctxId,
    { utterance },
  );
  assert.ok(lodgingTasks.length >= 1, "Test1 lodging task");

  const results = await dispatchAgentTasks(lodgingTasks, { utterance });
  assert.ok(results.length >= 1, "Test1 dispatch results");
  const r = results[0]!;
  assert.ok(r.agentId === "lodging", "Test1 lodging agent");
  assert.ok(r.result != null, "Test1 has result payload");
}

async function test2TripWithUsj() {
  const utterance = "오사카 4박5일 여행 준비해줘. USJ도 넣어줘.";
  assert.equal(isTripPrepUtterance(utterance), true, "Test2 trip_prep");

  const dag = decomposeGoal({
    contextEventId: "evt:test-usj",
    goal: utterance,
  });
  const agents = new Set(dag.nodes.map((n) => n.agentId).filter(Boolean));
  assert.ok(agents.has("lodging"), "Test2 lodging in DAG");
  assert.ok(
    dag.nodes.some((n) => n.id === "itinerary" || n.label.includes("itinerary")),
    "Test2 itinerary node",
  );
}

function test3LodgingOnly() {
  const failure = classifyAgentFailure({
    observation: obs({
      planId: "p",
      stepId: "s",
      stepKind: "resolve_entity",
      success: false,
      errors: ["empty_candidates"],
    }),
  });
  assert.equal(failure, "empty_result", "Test3 empty_result class");
  assert.equal(policyForFailure(failure), "alternative_search", "Test3 alternative search policy");
}

function test4EmptyResultReplan() {
  const dag = decomposeGoal({
    contextEventId: "evt:empty",
    goal: "오사카 여행 숙소",
  });
  const hotelNode = dag.nodes.find((n) => n.id === "hotel")!;
  const replan = semanticReplanFromFailure({
    dag,
    failedNodeId: hotelNode.id,
    failureClass: "empty_result",
    observation: obs({
      planId: "p",
      stepId: "s",
      stepKind: "resolve_entity",
      success: false,
      errors: ["empty_candidates"],
    }),
  });
  assert.ok(replan.alternativeToolId, "Test4 alternative tool");
  assert.ok(replan.summaryKo.includes("검색"), "Test4 semantic replan ko");
}

function test5ToolFailurePolicy() {
  const failure = classifyAgentFailure({
    observation: obs({
      planId: "p",
      stepId: "s",
      stepKind: "tool",
      success: false,
    }),
    tool: { ok: false, toolId: "hotel.lookup", summaryKo: "503 timeout", candidates: [] },
  });
  assert.equal(failure, "transient", "Test5 transient");
  assert.equal(policyForFailure(failure), "retry", "Test5 retry policy");
}

function test6HumanGate() {
  const failure = classifyAgentFailure({
    observation: obs({
      planId: "p",
      stepId: "s",
      stepKind: "wait_commit",
      success: true,
    }),
  });
  assert.equal(failure, "human_commit_required", "Test6 human commit");
  assert.equal(policyForFailure(failure), "commit_gate", "Test6 commit gate — NO auto commit");
}

function test7GoalConvergence() {
  const goal = {
    id: "g1",
    summary: "trip",
    summaryKo: "오사카 4박5일 여행 준비 USJ 일정",
  };

  const planDag: PlanDAG = {
    planId: "plan-test7",
    contextEventId: "evt:test7",
    rootGoalId: "root",
    status: "executing",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: "root",
        kind: "goal",
        label: "root",
        labelKo: goal.summaryKo,
        dependsOn: [],
        status: "done",
        retryCount: 0,
        maxRetries: 0,
      },
      {
        id: "hotel",
        kind: "task",
        label: "hotel",
        labelKo: "숙소",
        agentId: "lodging",
        dependsOn: [],
        status: "done",
        retryCount: 0,
        maxRetries: 2,
      },
    ],
  };

  const convergence = evaluateGoalConvergence({
    goal,
    planDag,
    observations: [
      obs({
        planId: "p",
        stepId: "hotel",
        stepKind: "resolve_entity",
        success: true,
        candidates: [{ id: "1", labelKo: "Hotel A" }],
      }),
    ],
  });
  assert.equal(
    convergence.status,
    "needs_more_work",
    "Test7 plan node done but goal needs activity/itinerary",
  );
}

function testLoopBudget() {
  assert.equal(ORCHESTRATOR_LOOP_BUDGET.MAX_AGENT_ITERATIONS, 12);
  assert.equal(ORCHESTRATOR_LOOP_BUDGET.MAX_REPLANS, 3);
  const ctx = createAgentExecutionContext({
    task: {
      nodeId: "n1",
      agentId: "lodging",
      label: "숙소",
      contextEventId: "evt:budget",
    },
    goal: { id: "g", summary: "test", summaryKo: "test" },
    utterance: "test",
  });
  assert.equal(ctx.iteration, 0);
}

async function main() {
  resetGraphCommandStoreForTests();
  await test1TripPrepOsaka();
  await test2TripWithUsj();
  test3LodgingOnly();
  test4EmptyResultReplan();
  test5ToolFailurePolicy();
  test6HumanGate();
  test7GoalConvergence();
  testLoopBudget();
  console.log("test-agent-runtime-autonomous-e2e: all passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
