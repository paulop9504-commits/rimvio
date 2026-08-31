/**
 * Platform Agent + Coding Agent E2E regression (CASE A–F scaffolding).
 */

import { runConversationGate } from "@/lib/agent/conversation";
import {
  compilePlatformGoal,
  discoverPlatformContext,
  planPlatformChanges,
  executionModeFromGoal,
  buildPlatformSourceMap,
} from "@/lib/hub/dev/platform-agent";
import { runHubAgentController } from "@/lib/hub/dev/hub-agent-controller";
import { invokeHubWorkspaceTool } from "@/lib/hub/dev/hub-workspace-tools";
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
      name: "hotel.search",
      description: "Search hotels",
      inputSchema: "{}",
      outputSchema: "hotel.search.response.v1",
      approvalRequired: false,
    },
    {
      id: "2",
      name: "booking.cancel",
      description: "Cancel booking",
      inputSchema: "{}",
      outputSchema: "booking.cancel.response.v1",
      approvalRequired: false,
    },
  ];
  draft.workflowDescription = "hotel.search → booking.prepare → payment.commit";
  const snapshot = buildProjectSnapshot({ draft });
  const executor = makeExecutor(draft);
  let plannerCalls = 0;
  let inspectCalls = 0;
  let toolCalls = 0;

  const result = await runHubAgentController({
    utterance,
    draft,
    snapshot,
    executor,
    skipRuntimeIngress: true,
    onEvent: (e) => {
      if (e.type === "plan") plannerCalls += 1;
      if (e.type === "observe") inspectCalls += 1;
      if (e.type === "tool" && e.status === "running") toolCalls += 1;
    },
  });

  return { result, plannerCalls, inspectCalls, toolCalls, draft: executor.getDraft() as PlatformDraft };
}

function testCaseA() {
  const gate = runConversationGate({ utterance: "ㅎㅇ", context: { currentPlatform: "OsakaStay" } });
  assert(gate.intent === "chat", "CASE A intent");
  assert(!gate.allowExecution, "CASE A no execution");
}

async function testCaseAController() {
  const m = await runController("ㅎㅇ");
  assert(m.result.executionStarted === false, "CASE A no agent");
  assert(m.toolCalls === 0, "CASE A no tools");
}

function testCaseBGoal() {
  const goal = compilePlatformGoal({
    utterance: "새로운 호텔 예약 플랫폼 만들어줘. 검색하고 객실 선택하고 결제까지",
    intent: "create",
    platformName: "OsakaStay",
  });
  assert(goal.ready === true, "CASE B goal ready");
  assert(goal.requestedCapabilities.length >= 4, "CASE B capabilities");
  const draft = createDefaultPlatformDraft();
  const discovery = discoverPlatformContext({ goal, utterance: "hotel platform", draft });
  const plan = planPlatformChanges({ goal, discovery, draft, stripeConnected: false });
  assert(plan.platformSteps.length >= 3, "CASE B platform plan");
}

async function testCaseC() {
  const m = await runController("호텔 검색 결과에 가격순 정렬 추가해줘");
  assert(m.result.executionStarted === true, "CASE C execution");
  assert(m.plannerCalls >= 1, "CASE C planner");
}

async function testCaseD() {
  const m = await runController("예약 취소하면 자동으로 환불되게 해줘");
  assert(m.result.executionStarted === true, "CASE D execution");
  const goal = compilePlatformGoal({
    utterance: "예약 취소하면 자동으로 환불되게 해줘",
    intent: "modify",
    platformName: "OsakaStay",
  });
  assert(goal.requestedCapabilities.includes("booking.cancel"), "CASE D booking.cancel");
}

async function testCaseE() {
  const m = await runController("booking.ts의 cancelBooking 함수 에러 처리 고쳐줘");
  assert(m.result.executionStarted === true, "CASE E execution");
  const goal = compilePlatformGoal({
    utterance: "booking.ts의 cancelBooking 함수 에러 처리 고쳐줘",
    intent: "modify",
    platformName: "OsakaStay",
  });
  assert(executionModeFromGoal(goal) === "code_direct", "CASE E code_direct");
}

async function testCaseF() {
  const gate = runConversationGate({ utterance: "배포해줘", context: { currentPlatform: "OsakaStay" } });
  assert(gate.intent === "publish", "CASE F publish intent");
}

function testPlatformSourceMap() {
  const draft = createDefaultPlatformDraft();
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
  const map = buildPlatformSourceMap(draft);
  assert(map.some((r) => r.id === "hotel.search"), "source map capability");
}

async function testCodingTools() {
  const draft = createDefaultPlatformDraft();
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
  const executor = makeExecutor(draft);
  const ctx = {
    getDraft: () => executor.getDraft() as PlatformDraft,
    updateDraft: (p: Partial<PlatformDraft>) => executor.updateDraft(p),
    snapshot: buildProjectSnapshot({ draft }),
    executor,
    connections: { stripe: false },
  };
  const r = await invokeHubWorkspaceTool("code.readFile", { capability: "hotel.search" }, ctx);
  assert(r.ok, "code.readFile");
}

async function main() {
  testCaseA();
  await testCaseAController();
  testCaseBGoal();
  await testCaseC();
  await testCaseD();
  await testCaseE();
  await testCaseF();
  testPlatformSourceMap();
  await testCodingTools();
  console.log("test-hub-platform-agent: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
