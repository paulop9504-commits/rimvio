/**
 * Hub Conversation Gate + Agent Controller regression tests (P0/P1).
 */

import {
  classifyIntent,
  resolveGoal,
  runConversationGate,
} from "@/lib/agent/conversation";
import { runHubAgentController } from "@/lib/hub/dev/hub-agent-controller";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import type { HubAgentControllerEvent } from "@/lib/hub/dev/hub-agent-controller";

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

type ControllerMetrics = {
  readonly result: Awaited<ReturnType<typeof runHubAgentController>>;
  readonly events: readonly string[];
  readonly toolCalls: number;
  readonly plannerCalls: number;
  readonly workspaceInspectCalls: number;
  readonly testCalls: number;
  readonly publishCalls: number;
  readonly observeCalls: number;
};

async function runController(utterance: string, staleGoal?: string): Promise<ControllerMetrics> {
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
  let plannerCalls = 0;
  let workspaceInspectCalls = 0;
  let testCalls = 0;
  let publishCalls = 0;
  let observeCalls = 0;

  const result = await runHubAgentController({
    utterance,
    draft,
    snapshot,
    executor,
    skipRuntimeIngress: true,
    staleGoal: staleGoal ?? "old stripe plan should not run",
    onEvent: (e: HubAgentControllerEvent) => {
      events.push(e.type);
      if (e.type === "tool" && e.status === "running") {
        toolCalls += 1;
        if (e.toolId === "workspace.inspect") workspaceInspectCalls += 1;
        if (e.toolId === "test.run") testCalls += 1;
        if (e.toolId === "deploy.prepare" || e.toolId === "publish.request") publishCalls += 1;
      }
      if (e.type === "plan") plannerCalls += 1;
      if (e.type === "observe") observeCalls += 1;
      if (e.type === "test_result") testCalls += 1;
    },
  });

  return {
    result,
    events,
    toolCalls,
    plannerCalls,
    workspaceInspectCalls,
    testCalls,
    publishCalls,
    observeCalls,
  };
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

function testCreateVague() {
  assert(classifyIntent("새로 플랫폼을 개발할거야").intent === "create", "vague create");
  const goal = resolveGoal("create", "새로 플랫폼을 개발할거야");
  assert(goal.ready === false, "vague create not ready");
  assert(goal.clarificationKo?.includes("어떤 플랫폼"), "asks clarification");
}

async function testChatNoExecution() {
  const m = await runController("ㅎㅇ");
  assert(m.result.intent === "chat", "intent chat");
  assert(m.result.executionStarted === false, "executionStarted false");
  assert(m.toolCalls === 0, "toolCalls 0");
  assert(m.plannerCalls === 0, "plannerCalls 0");
  assert(m.workspaceInspectCalls === 0, "workspaceInspectCalls 0");
  assert(m.testCalls === 0, "testCalls 0");
  assert(m.publishCalls === 0, "publishCalls 0");
  assert(m.result.conversational === true, "conversational");
}

async function testAnnyeongNoExecution() {
  const m = await runController("안녕");
  assert(m.result.intent === "chat", "intent chat");
  assert(m.result.executionStarted === false, "agentStarted false");
  assert(m.toolCalls === 0, "toolCalls 0");
}

async function testQuestionNoExecution() {
  const m = await runController("뭐 할 수 있어?");
  assert(m.result.intent === "question", "intent question");
  assert(m.result.executionStarted === false, "agentStarted false");
  assert(m.toolCalls === 0, "toolCalls 0");
}

async function testModifyExecution() {
  const m = await runController("호텔 검색 기능 추가해줘");
  assert(m.result.intent === "modify", "intent modify");
  assert(m.result.executionStarted === true, "executionStarted true");
  assert(m.plannerCalls >= 1, "plannerCalls >= 1");
}

async function testInspectOnly() {
  const m = await runController("현재 플랫폼 상태 확인해줘");
  assert(m.result.intent === "inspect", "intent inspect");
  assert(m.result.executionStarted === true, "inspect runs");
  assert(m.workspaceInspectCalls >= 1 || m.observeCalls >= 1, "workspace inspect");
  assert(m.plannerCalls === 0, "inspect must not call planner");
}

async function testConnectIntent() {
  const gate = runConversationGate({
    utterance: "Stripe 연결해줘",
    context: { platformName: "OsakaStay", currentPlatform: "OsakaStay" },
  });
  assert(gate.intent === "connect", "connect gate");
  assert(gate.allowTools === true, "tools allowed");
}

async function testCreateClarification() {
  const m = await runController("새로 플랫폼을 개발할거야");
  assert(m.result.intent === "create", "intent create");
  assert(m.result.executionStarted === false, "no auto execution");
  assert(m.workspaceInspectCalls === 0, "no OsakaStay inspect");
  assert(m.toolCalls === 0, "no tools");
  assert(m.events.includes("conversational"), "clarification response");
}

async function testStaleGoalIgnored() {
  const m = await runController("ㅎㅇ", "OsakaStay payment capability 추가");
  assert(m.result.executionStarted === false, "stale goal must not trigger execution on chat");
  assert(m.workspaceInspectCalls === 0, "no inspect after prior task");
}

async function testAfterTaskChatIsolated() {
  await runController("호텔 검색 기능 추가해줘");
  const m = await runController("ㅎㅇ");
  assert(m.result.intent === "chat", "chat after task");
  assert(m.result.executionStarted === false, "no execution after prior task");
  assert(m.toolCalls === 0, "no tools");
}

async function main() {
  testClassifyChat();
  testClassifyQuestion();
  testClassifyExecutable();
  testCreateVague();
  await testChatNoExecution();
  await testAnnyeongNoExecution();
  await testQuestionNoExecution();
  await testModifyExecution();
  await testInspectOnly();
  await testConnectIntent();
  await testCreateClarification();
  await testStaleGoalIgnored();
  await testAfterTaskChatIsolated();
  console.log("test-hub-intent-gate: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
