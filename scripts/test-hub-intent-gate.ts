/**
 * Hub Intent Gate + Agent Controller regression tests (P0).
 */

import { classifyIntent, runIntentGate } from "@/lib/agent/intent/intent-gate";
import { runHubAgentController } from "@/lib/hub/dev/hub-agent-controller";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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

async function runController(utterance: string) {
  const draft = createDefaultPlatformDraft();
  draft.name = "OsakaStay";
  draft.actions = [
    {
      id: "1",
      name: "booking.confirm",
      description: "Confirm",
      inputSchema: "{}",
      outputSchema: "booking.confirm.response.v1",
      approvalRequired: true,
    },
  ];
  const snapshot = buildProjectSnapshot({ draft });
  const executor = makeExecutor(draft);
  const events: string[] = [];
  let toolCalls = 0;

  const result = await runHubAgentController({
    utterance,
    draft,
    snapshot,
    executor,
    skipRuntimeIngress: true,
    staleGoal: "old stripe plan should not run",
    onEvent: (e) => {
      events.push(e.type);
      if (e.type === "tool" && e.status === "running") toolCalls += 1;
    },
  });

  return { result, events, toolCalls };
}

function testClassifyChat() {
  assert(classifyIntent("ㅎㅇ").intent === "chat", "ㅎㅇ → chat");
  assert(classifyIntent("안녕").intent === "chat", "안녕 → chat");
  assert(classifyIntent("뭐해?").intent === "chat", "뭐해 → chat");
}

function testClassifyQuestion() {
  assert(classifyIntent("무엇을 할 수 있어?").intent === "question", "capabilities question");
  assert(classifyIntent("OsakaStay가 뭐야?").intent === "question", "platform question");
}

function testClassifyExecutable() {
  assert(classifyIntent("호텔 검색 기능 추가해줘").intent === "modify", "modify");
  assert(classifyIntent("현재 플랫폼 상태 확인해줘").intent === "inspect", "inspect");
  assert(classifyIntent("Stripe 연결해줘").intent === "connect", "connect");
  assert(classifyIntent("테스트 돌려줘").intent === "test", "test");
  assert(classifyIntent("배포해줘").intent === "publish", "publish");
}

async function testChatNoExecution() {
  const { result, toolCalls } = await runController("ㅎㅇ");
  assert(result.intent === "chat", "intent chat");
  assert(result.executionStarted === false, "executionStarted false");
  assert(toolCalls === 0, "toolCalls 0");
  assert(result.conversational === true, "conversational");
}

async function testModifyExecution() {
  const { result } = await runController("호텔 검색 기능 추가해줘");
  assert(result.intent === "modify", "intent modify");
  assert(result.executionStarted === true, "executionStarted true");
}

async function testInspectOnly() {
  const { result, events } = await runController("현재 플랫폼 상태 확인해줘");
  assert(result.intent === "inspect", "intent inspect");
  assert(result.executionStarted === true, "inspect runs");
  assert(events.includes("observe"), "observe emitted");
}

async function testConnectIntent() {
  const gate = runIntentGate({ utterance: "Stripe 연결해줘", context: { platformName: "OsakaStay" } });
  assert(gate.intent === "connect", "connect gate");
  assert(gate.allowTools === true, "tools allowed");
}

async function testStaleGoalIgnored() {
  const { result } = await runController("ㅎㅇ");
  assert(result.executionStarted === false, "stale goal must not trigger execution on chat");
}

async function main() {
  testClassifyChat();
  testClassifyQuestion();
  testClassifyExecutable();
  await testChatNoExecution();
  await testModifyExecution();
  await testInspectOnly();
  await testConnectIntent();
  await testStaleGoalIgnored();
  console.log("test-hub-intent-gate: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
