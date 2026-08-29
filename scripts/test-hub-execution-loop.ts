/**
 * Platform Agent Orchestrator spine — Goal State + Execution Ledger + Loop.
 */

import { compilePlatformGoal } from "@/lib/hub/dev/platform-agent/platform-goal";
import {
  initPlatformOrchestrator,
  advanceOrchestratorPhase,
  recordOrchestratorStepStart,
  recordOrchestratorStepResult,
  evaluateOrchestratorVerification,
  orchestratorPartialReplan,
  orchestratorWorkLog,
} from "@/lib/hub/dev/platform-agent/agent-orchestrator";
import {
  RIMVIO_PLATFORM_EXECUTION_LOOP,
  RIMVIO_CAPABILITY_TAXONOMY,
} from "@/lib/hub/dev/platform-agent/execution-loop";
import { summarizeExecutionLedger } from "@/lib/hub/dev/platform-agent/execution-ledger";
import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testExecutionLoopStages() {
  assert(RIMVIO_PLATFORM_EXECUTION_LOOP[0] === "goal_intake", "loop starts at goal_intake");
  assert(RIMVIO_PLATFORM_EXECUTION_LOOP.includes("replan"), "loop includes replan");
  assert(RIMVIO_PLATFORM_EXECUTION_LOOP.at(-1) === "commit", "loop ends at commit");
  assert(RIMVIO_CAPABILITY_TAXONOMY.understanding.includes("goal.create"), "taxonomy A");
  assert(RIMVIO_CAPABILITY_TAXONOMY.governance.includes("approval.request"), "taxonomy I");
}

function testGoalStateAndLedger() {
  const goal = compilePlatformGoal({
    utterance: "호텔 예약 플랫폼 만들어줘",
    intent: "create",
    platformName: "OsakaStay",
  });

  const steps: HubAgentPlanStep[] = [
    { id: "s1", label: "hotel.search 생성", toolId: "capability.create", args: { capability: "hotel.search" } },
    { id: "s2", label: "테스트", toolId: "test.run" },
  ];

  let ctx = initPlatformOrchestrator({ goal, planSteps: steps, maxReplans: 2 });
  ctx = advanceOrchestratorPhase(ctx, "plan", "Platform plan");
  assert(ctx.goalState.pending.length >= 1, "goal state has pending steps");
  assert(ctx.goalState.inProgress === "s1", "first step in progress");

  ctx = recordOrchestratorStepStart(ctx, steps[0]!);
  ctx = recordOrchestratorStepResult(ctx, steps[0]!, true, "hotel.search 생성 완료");
  assert(ctx.goalState.completed.includes("s1"), "step completed on board");

  const verify = evaluateOrchestratorVerification(ctx, false, "0/1 passed");
  assert(verify.decision === "replan", "failed verify → replan");

  ctx = orchestratorPartialReplan(verify.ctx, {
    failedStepId: "s2",
    repairSteps: [{ id: "repair_schema", label: "schema 수정", toolId: "schema.update" }],
    reasonKo: "schema invalid",
  });
  assert(ctx.goalState.replanCount === 1, "partial replan increments count");
  assert(ctx.ledger.entries.some((e) => e.kind === "replan"), "ledger records replan");

  const log = orchestratorWorkLog(ctx);
  assert(log.includes("replan") || log.includes("진행") || log.length > 0, "work log");
  assert(summarizeExecutionLedger(ctx.ledger).includes("실행"), "ledger summary");
}

function main() {
  testExecutionLoopStages();
  testGoalStateAndLedger();
  console.log("test-hub-execution-loop: all passed");
}

main();
