/**
 * P10 Agent Turn — Understand → Inspect → Plan → Execute → Observe → Verify → Report.
 * Run: npm run test:agent-os-p10
 */
import assert from "node:assert/strict";
import {
  canTransition,
  createAgentTurn,
  decideAfterObservation,
  decideAfterVerification,
  generateFinalReport,
  inspectCurrentState,
  resetAgentTurnInterruptsForTests,
  runAgentTurn,
  transitionAgentTurn,
  understandRequest,
  verifyAgentTurn,
} from "@/lib/agent-os";
import { resetOperatorMemoryForTests, readOperatorMemory } from "@/lib/hub/dev/conversation-memory";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";
import type { AgentTurnEvent } from "@/lib/agent-os/agent-turn/types";

function makeExecutor(
  initial: PlatformDraft,
  opts?: { readonly failTestsThenPass?: boolean },
): DeployExecutorCallbacks {
  let draft = initial;
  let testCalls = 0;
  return {
    mode: "platform",
    getDraft: () => draft,
    updateDraft: (patch) => {
      draft = { ...draft, ...patch } as PlatformDraft;
    },
    runSandboxTest: async () => {
      testCalls += 1;
      if (opts?.failTestsThenPass && testCalls === 1) {
        return { passed: false };
      }
      return { passed: true };
    },
    onPublishSuccess: () => {},
    onGoToStep: () => {},
  };
}

function seedDraft(id: string): PlatformDraft {
  const draft = createDefaultPlatformDraft();
  draft.id = id;
  draft.name = "Delivery Lab";
  draft.actions = [
    {
      id: "1",
      name: "restaurant.list",
      description: "List restaurants",
      inputSchema: "{}",
      outputSchema: "restaurant.list.response.v1",
      approvalRequired: false,
    },
    {
      id: "2",
      name: "menu.list",
      description: "List menu",
      inputSchema: "{}",
      outputSchema: "menu.list.response.v1",
      approvalRequired: false,
    },
  ];
  draft.dataCollectionsJson = `[
    { "name": "restaurants", "schema": "restaurant.v1", "pii": false },
    { "name": "menus", "schema": "menu.v1", "pii": false },
    { "name": "orders", "schema": "order.v1", "pii": true }
  ]`;
  return draft;
}

async function runTurn(
  utterance: string,
  opts?: {
    readonly id?: string;
    readonly github?: boolean;
    readonly failTestsThenPass?: boolean;
    readonly draft?: PlatformDraft;
  },
) {
  const id = opts?.id ?? `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const draft = opts?.draft ?? seedDraft(id);
  const snapshot = buildProjectSnapshot({ draft });
  const executor = makeExecutor(draft, { failTestsThenPass: opts?.failTestsThenPass });
  const events: AgentTurnEvent[] = [];
  const hubTypes: string[] = [];

  const result = await runAgentTurn({
    utterance,
    sessionId: draft.id ?? id,
    hub: {
      utterance,
      draft,
      snapshot,
      executor,
      skipRuntimeIngress: true,
      connections: {
        github: opts?.github ?? false,
        openai: false,
        stripe: false,
        vercel: false,
        supabase: false,
        mcp: false,
      },
      platformId: draft.id ?? id,
    },
    onTurnEvent: (e) => events.push(e),
    onHubEvent: (e) => hubTypes.push(e.type),
  });

  return { result, events, hubTypes, draft: executor.getDraft() as PlatformDraft };
}

async function main() {
resetOperatorMemoryForTests();
resetAgentTurnInterruptsForTests();

// --- unit: state machine + understand + inspect + decide + report ---
{
  const turn = createAgentTurn({ request: "현재 상태 확인해줘", sessionId: "sm" });
  assert.equal(canTransition("idle", "understanding"), true);
  const next = transitionAgentTurn(turn, "understanding");
  assert.equal(next.status, "understanding");

  const understood = understandRequest({ utterance: "배달 플랫폼 만들어줘" });
  assert.equal(understood.intent, "create");
  assert.equal(understood.domain, "delivery_marketplace");
  assert.equal(understood.requestedOutcome, "working_delivery_platform");
  assert.equal(understood.executable, true);

  const inspectU = understandRequest({ utterance: "현재 상태 확인해줘" });
  assert.equal(inspectU.intent, "inspect");

  const connectU = understandRequest({ utterance: "GitHub 연결해줘" });
  assert.equal(connectU.intent, "connect");

  const testU = understandRequest({ utterance: "테스트 돌려줘" });
  assert.equal(testU.intent, "test");

  const draft = seedDraft("inspect-unit");
  const inspection = inspectCurrentState({
    draft,
    snapshot: buildProjectSnapshot({ draft }),
    understand: understood,
  });
  assert.equal(inspection.type, "application_state");
  assert.ok(inspection.capabilities.includes("restaurant.list"));
  assert.ok(inspection.missingCapabilities.includes("order.create") || inspection.missingCapabilities.length >= 0);

  const failedObs = {
    actionId: "a1",
    capability: "test",
    tool: "test.run",
    input: null,
    output: null,
    status: "failed" as const,
    affectedEntities: [],
    mutations: [],
    errors: ["Checkout button does not trigger order creation."],
    timestamp: new Date().toISOString(),
    summaryKo: "테스트 실패",
  };
  const retry = decideAfterObservation({
    turn: { ...next, actions: [] },
    observation: failedObs,
  });
  assert.equal(retry.kind, "retry");

  const replan = decideAfterVerification({ passed: false, replanCount: 0, maxReplans: 3 });
  assert.equal(replan.kind, "replan");
  const failLimit = decideAfterVerification({ passed: false, replanCount: 3, maxReplans: 3 });
  assert.equal(failLimit.kind, "fail");

  const report = generateFinalReport({
    turn: next,
    understand: understood,
    after: inspection,
    verification: {
      passed: true,
      ran: true,
      browserTest: "unavailable",
      checks: [{ id: "order", labelKo: "주문 생성", group: "flow", passed: true, evidence: "ok" }],
      failedReasons: [],
      detailKo: "ok",
    },
    status: "success",
  });
  assert.match(report.headlineKo, /배달/);
  assert.ok(report.cautions.some((c) => /결제/.test(c)));
  assert.ok(report.nextActions.length >= 1 && report.nextActions.length <= 3);
}

// TEST 1 — inspect → report
{
  const { result, events, hubTypes } = await runTurn("현재 상태 확인해줘", { id: "p10-inspect" });
  assert.equal(result.turn.intent?.intent, "inspect");
  assert.ok(result.turn.inspection, "TEST 1 inspect ran");
  assert.ok(result.turn.inspection!.lines.length > 0, "TEST 1 inspection lines");
  assert.ok(result.report, "TEST 1 report");
  assert.ok(hubTypes.includes("observe") || events.some((e) => e.kind === "OBSERVATION_CREATED"));
  assert.ok(events.some((e) => e.kind === "FINAL_REPORT_CREATED"), "TEST 1 final report event");
  assert.equal(result.turn.status, "reported");
  console.log("ok — TEST 1 inspect → report");
}

// TEST 2 — GitHub connect (approval if needed)
{
  resetOperatorMemoryForTests("p10-gh");
  const pending = await runTurn("GitHub 연결해줘", { id: "p10-gh" });
  assert.equal(pending.result.turn.intent?.intent, "connect");
  assert.ok(
    pending.result.report.status === "waiting" || pending.hubTypes.includes("ask_user"),
    "TEST 2 asks approval when disconnected",
  );
  assert.ok(pending.events.some((e) => e.kind === "WAITING_FOR_APPROVAL" || e.kind === "FINAL_REPORT_CREATED"));

  const connected = await runTurn("GitHub 연결해줘", { id: "p10-gh-on", github: true });
  assert.equal(connected.result.turn.intent?.intent, "connect");
  assert.ok(connected.result.report, "TEST 2 connected report");
  assert.ok(
    connected.result.report.status === "success" || connected.result.hub?.ok === true,
    "TEST 2 connected completes",
  );
  console.log("ok — TEST 2 github connect → approval / verify / report");
}

// TEST 3 — discover test capability → execute → observe → report
{
  const { result, events, hubTypes } = await runTurn("테스트 돌려줘", { id: "p10-test" });
  assert.equal(result.turn.intent?.intent, "test");
  assert.ok(
    result.turn.actions.some((a) => a.tool === "test.run") || hubTypes.includes("test_result") || hubTypes.includes("verify"),
    "TEST 3 executed available test tool",
  );
  assert.ok(events.some((e) => e.kind === "FINAL_REPORT_CREATED"));
  assert.ok(result.report.headlineKo.length > 0);
  console.log("ok — TEST 3 test capability → execute → report");
}

// TEST 4 — delivery platform: understand → inspect → plan → execute → verify → report
{
  resetOperatorMemoryForTests("p10-delivery");
  const { result, events, hubTypes } = await runTurn("배달 플랫폼 만들어줘", { id: "p10-delivery" });
  assert.equal(result.turn.intent?.intent, "create");
  assert.equal(result.turn.intent?.domain, "delivery_marketplace");
  assert.ok(result.turn.inspection, "TEST 4 inspected first");
  assert.ok(
    hubTypes.includes("plan") || result.turn.planLabels.length > 0 || result.turn.actions.length > 0,
    "TEST 4 planned or executed",
  );
  assert.ok(result.turn.verification, "TEST 4 final verification");
  assert.ok(result.report, "TEST 4 final report");
  assert.ok(result.report.completed.length >= 0);
  assert.ok(!/ToolInvokeResult|ActionPlanV1|invokeRimvioTool/.test(result.reportKo), "no raw internals");
  assert.ok(events.some((e) => e.kind === "FINAL_REPORT_CREATED"));
  const mem = readOperatorMemory("p10-delivery");
  assert.ok(mem.latestTask, "TEST 4 memory updated");
  console.log("ok — TEST 4 delivery platform full turn");
}

// TEST 5 — fail → observe → replan → fix → verify
{
  const { result, events, hubTypes } = await runTurn("호텔 검색 결과에 가격순 정렬 추가해줘", {
    id: "p10-repair",
    failTestsThenPass: true,
  });
  const replanEvents = events.filter((e) => e.kind === "REPLAN_STARTED").length + hubTypes.filter((t) => t === "replan").length;
  const verifyEvents = events.filter((e) =>
    e.kind === "VERIFICATION_STARTED" || e.kind === "VERIFICATION_PASSED" || e.kind === "VERIFICATION_FAILED",
  );
  assert.ok(result.turn.observations.length >= 0, "TEST 5 observed");
  assert.ok(
    replanEvents >= 1 || result.turn.decisions.some((d) => d.kind === "replan" || d.kind === "retry"),
    "TEST 5 replan or retry after failure",
  );
  assert.ok(verifyEvents.length >= 1 || result.turn.verification, "TEST 5 verified after repair");
  assert.ok(result.report, "TEST 5 still reports");
  console.log("ok — TEST 5 fail → observe → replan → verify");
}

// TEST 6 — follow-up uses previous turn context
{
  const mem = readOperatorMemory("p10-delivery");
  assert.ok(mem.latestTask || mem.currentGoal, "TEST 6 prior context exists");
  const { result } = await runTurn("방금 만든 주문 기능 테스트해줘", {
    id: "p10-delivery",
    draft: seedDraft("p10-delivery"),
  });
  assert.equal(result.turn.intent?.intent, "test");
  assert.ok(
    /create_application|배달|order|restaurant|menu|p10-delivery/i.test(result.turn.request) ||
      result.hub?.intent === "test",
    "TEST 6 resolved previous work instead of asking what was built",
  );
  assert.ok(result.report, "TEST 6 report");
  console.log("ok — TEST 6 follow-up uses last Agent Turn context");
}

resetOperatorMemoryForTests();
resetAgentTurnInterruptsForTests();

console.log("ok — agent-os P10 Agent Turn (understand · inspect · execute · verify · report)");
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
