/**
 * Capability #1 — Intent Understanding
 * Unit · Integration · E2E tests
 *
 * Sprint gate: all must PASS before Capability #2.
 */

import { understandIntent, assertIntentPolicy } from "@/lib/agent/capabilities/intent-understand";
import { runConversationGate } from "@/lib/agent/conversation/conversation-gate";
import { runHubAgentController } from "@/lib/hub/dev/hub-agent-controller";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// ─── UNIT ───────────────────────────────────────────────────────────────────

function testUnitGreeting() {
  const out = understandIntent({ utterance: "ㅎㅇ" });
  assert(out.ok, "ok");
  assert(out.ok && out.result.intent === "chat", "chat");
  assert(out.ok && !out.result.executable, "not executable");
  assertIntentPolicy(out.result);
}

function testUnitCreatePlatform() {
  const out = understandIntent({ utterance: "호텔 예약 플랫폼 만들어줘." });
  assert(out.ok && out.result.intent === "create", "create");
  assert(out.ok && out.result.executable, "executable");
}

function testUnitInspect() {
  const out = understandIntent({ utterance: "현재 플랫폼 분석해줘." });
  assert(out.ok && out.result.intent === "inspect", "inspect");
}

function testUnitModify() {
  const out = understandIntent({ utterance: "호텔 검색 기능 추가해줘." });
  assert(out.ok && out.result.intent === "modify", "modify");
}

function testUnitTestIntent() {
  const out = understandIntent({ utterance: "테스트 돌려줘." });
  assert(out.ok && out.result.intent === "test", "test");
}

function testUnitEmpty() {
  const out = understandIntent({ utterance: "   " });
  assert(!out.ok && out.error.code === "empty_utterance", "empty error");
}

function testUnitPlatformContextDoesNotOverride() {
  const out = understandIntent({
    utterance: "ㅎㅇ",
    context: {
      currentPlatform: "OsakaStay",
      currentGoal: "add payment capability",
      staleGoal: "inspect platform",
    },
  });
  assert(out.ok && out.result.intent === "chat", "still chat despite stale platform goal");
}

function testUnitEntities() {
  const out = understandIntent({ utterance: "@hotel.search 가격순으로" });
  assert(out.ok && out.result.entities.some((e) => e.value === "hotel.search"), "entity");
  assert(out.ok && out.result.constraints.some((c) => c.kind === "sort"), "constraint");
}

// ─── INTEGRATION (Gate uses same classifier path) ───────────────────────────

function testIntegrationGateAlignsWithCap1() {
  const cases: Array<{ utterance: string; intent: string }> = [
    { utterance: "ㅎㅇ", intent: "chat" },
    { utterance: "호텔 예약 플랫폼 만들어줘.", intent: "create" },
    { utterance: "현재 플랫폼 분석해줘.", intent: "inspect" },
    { utterance: "호텔 검색 기능 추가해줘.", intent: "modify" },
    { utterance: "테스트 돌려줘.", intent: "test" },
  ];

  for (const c of cases) {
    const cap = understandIntent({ utterance: c.utterance, context: { currentPlatform: "OsakaStay" } });
    const gate = runConversationGate({ utterance: c.utterance, context: { currentPlatform: "OsakaStay" } });
    assert(cap.ok && cap.result.intent === c.intent, `cap ${c.utterance}`);
    assert(gate.intent === c.intent, `gate ${c.utterance}`);
  }
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

// ─── E2E (Controller — TEST 1 forbidden paths) ────────────────────────────

async function testE2EChatNoExecution() {
  const draft = createDefaultPlatformDraft();
  draft.name = "OsakaStay";
  draft.actions = [
    {
      id: "1",
      name: "hotel.search",
      description: "",
      inputSchema: "{}",
      outputSchema: "v1",
      approvalRequired: false,
    },
  ];
  const snapshot = buildProjectSnapshot({ draft });
  const executor = makeExecutor(draft);

  let toolCalls = 0;
  let plannerCalls = 0;
  let observeCalls = 0;

  const result = await runHubAgentController({
    utterance: "ㅎㅇ",
    draft,
    snapshot,
    executor,
    skipRuntimeIngress: true,
    onEvent: (e) => {
      if (e.type === "tool" && e.status === "running") toolCalls += 1;
      if (e.type === "plan") plannerCalls += 1;
      if (e.type === "observe") observeCalls += 1;
    },
  });

  assert(result.intent === "chat", "E2E intent chat");
  assert(!result.executionStarted, "E2E no execution");
  assert(toolCalls === 0, "E2E no tools");
  assert(plannerCalls === 0, "E2E no planner");
  assert(observeCalls === 0, "E2E no observe");
  assert(result.conversational === true, "E2E conversational");
}

async function testE2EExecutableIntentsStart() {
  const draft = createDefaultPlatformDraft();
  draft.name = "OsakaStay";
  const snapshot = buildProjectSnapshot({ draft });
  const executor = makeExecutor(draft);

  const modify = await runHubAgentController({
    utterance: "호텔 검색 기능 추가해줘",
    draft,
    snapshot,
    executor,
    skipRuntimeIngress: true,
    onEvent: () => {},
  });
  assert(modify.intent === "modify" && modify.executionStarted, "modify executes");

  const inspect = await runHubAgentController({
    utterance: "현재 플랫폼 분석해줘",
    draft,
    snapshot,
    executor: makeExecutor(draft),
    skipRuntimeIngress: true,
    onEvent: () => {},
  });
  assert(inspect.intent === "inspect" && inspect.executionStarted, "inspect executes");
}

function main() {
  testUnitGreeting();
  testUnitCreatePlatform();
  testUnitInspect();
  testUnitModify();
  testUnitTestIntent();
  testUnitEmpty();
  testUnitPlatformContextDoesNotOverride();
  testUnitEntities();
  testIntegrationGateAlignsWithCap1();
}

async function runAsync() {
  main();
  await testE2EChatNoExecution();
  await testE2EExecutableIntentsStart();
  console.log("test-capability-01-intent-understanding: ok");
  console.log("CAPABILITY #1 — Intent Understanding — COMPLETE (unit + integration + E2E)");
}

runAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});
