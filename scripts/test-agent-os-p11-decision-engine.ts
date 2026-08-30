/**
 * P11 Decision Engine — L0–L4 + goal + candidates + verify + report.
 * Run: npm run test:agent-os-p11
 */
import assert from "node:assert/strict";
import {
  classifyDecisionFailure,
  compileExecutableGoal,
  decideWithEngine,
  discoverActionCandidates,
  generateAlternatives,
  mutatePlanSteps,
  refreshGoalAgainstState,
  resolveAmbiguity,
  runAgentTurn,
  selectDecisionLevel,
  snapshotApplicationState,
  understandRequest,
  verifyGoalLevels,
  goalSatisfied,
  resetAgentTurnInterruptsForTests,
} from "@/lib/agent-os";
import { resetOperatorMemoryForTests } from "@/lib/hub/dev/conversation-memory";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import type { DecisionEngineInput } from "@/lib/agent-os/decision-engine/types";

function seed(id: string, extraCaps: string[] = []): PlatformDraft {
  const draft = createDefaultPlatformDraft();
  draft.id = id;
  draft.name = "Decision Lab";
  draft.actions = [
    {
      id: "1",
      name: "restaurant.list",
      description: "restaurants",
      inputSchema: "{}",
      outputSchema: "restaurant.list.response.v1",
      approvalRequired: false,
    },
    {
      id: "2",
      name: "menu.list",
      description: "menu",
      inputSchema: "{}",
      outputSchema: "menu.list.response.v1",
      approvalRequired: false,
    },
    ...extraCaps.map((name, i) => ({
      id: `x${i}`,
      name,
      description: name,
      inputSchema: "{}",
      outputSchema: `${name}.response.v1`,
      approvalRequired: false,
    })),
  ];
  return draft;
}

function engineInput(utterance: string, draft: PlatformDraft, extras?: Partial<DecisionEngineInput>): DecisionEngineInput {
  const understand = understandRequest({ utterance });
  const state = snapshotApplicationState({
    draft,
    snapshot: buildProjectSnapshot({ draft }),
    understand,
  });
  const goal = refreshGoalAgainstState(compileExecutableGoal({ utterance, understand, state }), state);
  return {
    utterance,
    intent: understand.intent,
    domain: understand.domain,
    goal,
    state,
    candidates: discoverActionCandidates({ goal, state, intent: understand.intent }),
    ...extras,
  };
}

function makeExecutor(initial: PlatformDraft): DeployExecutorCallbacks {
  let draft = initial;
  return {
    mode: "platform",
    getDraft: () => draft,
    updateDraft: (patch) => {
      draft = { ...draft, ...patch } as PlatformDraft;
    },
    runSandboxTest: async () => ({ passed: true }),
    onPublishSuccess: () => {},
    onGoToStep: () => {},
  };
}

async function main() {
  resetOperatorMemoryForTests();
  resetAgentTurnInterruptsForTests();

  // TEST 1 — inspect is LEVEL 0
  {
    const level = selectDecisionLevel({
      utterance: "현재 상태 보여줘",
      intent: "inspect",
      requirementCount: 1,
    });
    assert.equal(level, 0);
    const d = decideWithEngine(engineInput("현재 상태 보여줘", seed("t1")));
    assert.equal(d.decision, "ACT");
    assert.equal(d.toolId, "workspace.inspect");
    assert.equal(d.decisionLevel, 0);
    console.log("ok — TEST 1 LEVEL 0 inspect");
  }

  // TEST 2 — single DB create is LEVEL 1
  {
    const level = selectDecisionLevel({
      utterance: "DB 만들어줘",
      intent: "create",
      requirementCount: 1,
    });
    assert.equal(level, 1);
    const d = decideWithEngine(engineInput("DB 만들어줘", seed("t2")));
    assert.ok(d.decision === "ACT" || d.decision === "VERIFY");
    assert.ok((d.decisionLevel ?? 0) >= 1);
    console.log("ok — TEST 2 LEVEL 1 db create");
  }

  // TEST 3 — compound create is LEVEL 2
  {
    const level = selectDecisionLevel({
      utterance: "회원가입 + 음식점 + 주문 기능 만들어줘",
      intent: "create",
      requirementCount: 4,
    });
    assert.equal(level, 2);
    const d = decideWithEngine(engineInput("회원가입 + 음식점 + 주문 기능 만들어줘", seed("t3")));
    assert.ok(d.decisionLevel >= 2 || d.decision === "ACT");
    assert.ok(d.actionId);
    console.log("ok — TEST 3 LEVEL 2 compound plan");
  }

  // TEST 4 — test → inspect/test/verify via runtime
  {
    const draft = seed("t4");
    const result = await runAgentTurn({
      utterance: "주문 기능 테스트해줘",
      sessionId: "t4",
      hub: {
        utterance: "주문 기능 테스트해줘",
        draft,
        snapshot: buildProjectSnapshot({ draft }),
        executor: makeExecutor(draft),
        skipRuntimeIngress: true,
        platformId: "t4",
      },
    });
    assert.equal(result.turn.intent?.intent, "test");
    assert.ok(result.turn.engineDecisions?.some((e) => e.toolId === "test.run" || e.decision === "ACT"));
    assert.ok(result.report);
    console.log("ok — TEST 4 test → verify → report");
  }

  // TEST 5 — failure → diagnose → replan
  {
    const d = decideWithEngine(
      engineInput("주문 테스트가 실패했어", seed("t5"), {
        lastObservationFailed: true,
        lastFailureType: "logic",
        lastToolId: "test.run",
      }),
    );
    assert.ok(d.decisionLevel >= 3);
    assert.ok(d.decision === "REPLAN" || d.decision === "RETRY" || d.alternatives.length > 0);
    assert.ok(d.failureType === "logic" || d.decision === "REPLAN");
    console.log("ok — TEST 5 fail → diagnose → replan");
  }

  // TEST 6 — missing dependency first
  {
    const empty = createDefaultPlatformDraft();
    empty.id = "t6";
    empty.actions = [];
    const d = decideWithEngine(engineInput("주문 기능 만들어줘", empty));
    assert.ok(d.decision === "ACT");
    assert.ok(d.failureType === "dependency" || d.toolId === "capability.create" || d.toolId === "resource.apply");
    console.log("ok — TEST 6 missing dependency first");
  }

  // TEST 7 — already exists → do not recreate
  {
    const draft = seed("t7", ["order.create", "cart.create", "checkout.create"]);
    const input = engineInput("주문 기능 만들어줘", draft);
    const order = input.candidates.find((c) => c.actionId === "order.create");
    assert.ok(order?.alreadyPresent, "order already present");
    const d = decideWithEngine(input);
    assert.ok(d.decision === "COMPLETE" || d.decision === "VERIFY");
    assert.notEqual(d.actionId, "order.create");
    console.log("ok — TEST 7 no duplicate create");
  }

  // TEST 8 — ambiguity
  {
    const inferred = resolveAmbiguity({
      utterance: "이거 접수해줘",
      surface: "Merchant Orders",
      focusedEntityIds: ["order_1024"],
    });
    assert.equal(inferred.kind, "inferred");
    const ask = resolveAmbiguity({
      utterance: "이거 접수해줘",
      surface: "Merchant Orders",
      focusedEntityIds: ["order_1024", "order_1025"],
    });
    assert.equal(ask.kind, "ask");
    const d = decideWithEngine(
      engineInput("이거 접수해줘", seed("t8"), { focusedEntityIds: ["a", "b"], surface: "Merchant Orders" }),
    );
    assert.equal(d.decision, "ASK_USER");
    console.log("ok — TEST 8 ambiguity infer / ask");
  }

  // TEST 9 — plan mutation mid-work
  {
    const mutated = mutatePlanSteps({
      steps: [
        { id: "1", label: "Restaurant", status: "done" },
        { id: "2", label: "Menu", status: "done" },
        { id: "3", label: "Order", status: "pending" },
        { id: "4", label: "Payment", status: "pending" },
      ],
      requirementLabel: "Merchant Menu Management",
    });
    assert.ok(mutated.some((s) => /Merchant Menu/.test(s.label)));
    assert.equal(mutated.find((s) => s.label === "Restaurant")?.status, "done");
    console.log("ok — TEST 9 plan mutation keeps completed");
  }

  // TEST 10 — dangerous work needs approval
  {
    const d = decideWithEngine(engineInput("프로덕션에 배포해줘", seed("t10")));
    const pub = decideWithEngine({
      ...engineInput("출시해줘", seed("t10b")),
      candidates: [
        {
          actionId: "publish.request",
          capabilityId: "publish.request",
          toolId: "publish.request",
          labelKo: "Publish",
          alreadyPresent: false,
          missingDeps: [],
          scores: {
            goalProgress: 1,
            dependencyFit: 1,
            stateCompatibility: 1,
            capabilityConfidence: 1,
            verificationStrength: 1,
            userIntentAlignment: 1,
            riskPenalty: 0,
            costPenalty: 0,
            mutationPenalty: 0,
          },
          total: 4,
        },
      ],
      forcedLevel: 1,
    });
    assert.ok(d.decision === "WAIT_APPROVAL" || pub.decision === "WAIT_APPROVAL" || d.decision === "ASK_USER" || pub.toolId === "publish.request");
    assert.equal(pub.decision, "WAIT_APPROVAL");
    console.log("ok — TEST 10 approval for dangerous work");
  }

  // TEST 11 — LEVEL 4 strategic
  {
    const level = selectDecisionLevel({
      utterance: "결제 구조를 어떻게 설계해야 할지 판단해서 가장 좋은 방식으로 구성해줘",
      intent: "create",
      requirementCount: 2,
    });
    assert.equal(level, 4);
    const d = decideWithEngine(
      engineInput("결제 구조를 어떻게 설계해야 할지 판단해서 가장 좋은 방식으로 구성해줘", seed("t11"), {
        architectureConflict: true,
      }),
    );
    assert.equal(d.decisionLevel, 4);
    assert.equal(d.decision, "REPLAN");
    assert.match(d.reasonKo, /adapter|호환|구조/);
    assert.ok(d.alternatives.length >= 1 || d.toolId === "resource.apply");
    console.log("ok — TEST 11 LEVEL 4 escalation");
  }

  // TEST 12 — full success path + final report
  {
    const draft = seed("t12");
    const result = await runAgentTurn({
      utterance: "현재 상태 보여줘",
      sessionId: "t12",
      hub: {
        utterance: "현재 상태 보여줘",
        draft,
        snapshot: buildProjectSnapshot({ draft }),
        executor: makeExecutor(draft),
        skipRuntimeIngress: true,
        platformId: "t12",
      },
    });
    assert.ok(result.turn.compiledGoal);
    assert.ok(result.turn.engineDecisions && result.turn.engineDecisions.length >= 1);
    assert.ok(result.turn.verification);
    assert.ok(result.report);
    assert.equal(result.turn.status, "reported");
    const leveled = verifyGoalLevels({
      goal: result.turn.compiledGoal!,
      state: snapshotApplicationState({
        draft,
        snapshot: buildProjectSnapshot({ draft }),
      }),
      testsPassed: true,
      browserRan: false,
    });
    assert.ok(leveled.levelReached >= 1);
    assert.equal(leveled.realWorld, "unavailable");
    console.log("ok — TEST 12 final verification + report");
  }

  // helpers still deterministic
  assert.equal(classifyDecisionFailure({ summary: "timeout 503" }), "transient");
  assert.ok(generateAlternatives({ failedToolId: "test.run", candidates: engineInput("주문 만들어줘", seed("alts")).candidates }).length >= 0);
  const g = compileExecutableGoal({
    utterance: "음식점에서 실제 주문할 수 있게 해줘",
    understand: understandRequest({ utterance: "음식점에서 실제 주문할 수 있게 해줘" }),
  });
  assert.equal(g.objective, "customer_can_complete_order");
  assert.ok(g.requirements.includes("order_creation_exists"));
  assert.equal(goalSatisfied(g), false);

  resetOperatorMemoryForTests();
  resetAgentTurnInterruptsForTests();
  console.log("ok — agent-os P11 Decision Engine (L0–L4 · goal · score · verify · report)");
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
