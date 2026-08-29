/**
 * P0–P10 Hub Platform Agent — unified phase regression.
 */

import {
  classifyIntent,
  runConversationGate,
  compilePlatformGoal,
  summarizePlatformGoal,
} from "@/lib/agent/conversation";
import {
  buildIssueGraph,
  detectRegression,
  planVerifyRepair,
} from "@/lib/hub/dev/hub-verify-repair";
import { inspectPreviewWithBrowser } from "@/lib/hub/dev/preview-agent-verify";
import { planPlatformChanges } from "@/lib/hub/dev/platform-agent/platform-planner";
import { discoverPlatformContext } from "@/lib/hub/dev/platform-agent/context-discovery";
import { resolveDevModeLayout } from "@/lib/hub/dev/developer-mode";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testP0ChatGate() {
  const gate = runConversationGate({ utterance: "ㅎㅇ" });
  assert(gate.intent === "chat", "P0 chat intent");
  assert(!gate.allowTools && !gate.allowPlanner, "P0 no tools/planner");
  assert(gate.conversational, "P0 conversational");
}

function testP1PlatformGoal() {
  const create = compilePlatformGoal({
    utterance: "일본 여행자를 위한 호텔 예약 플랫폼 만들어줘 검색 예약 결제",
    intent: "create",
    platformName: "OsakaStay",
  });
  assert(create.goalKind === "create", "P1 goalKind create");
  assert(create.domain === "hotel_booking", "P1 hotel domain");
  assert(create.scope.kind === "new_platform", "P1 new platform scope");
  assert(create.requestedCapabilities.includes("hotel.search"), "P1 hotel.search cap");
  assert(create.ready, "P1 goal ready");

  const modify = compilePlatformGoal({
    utterance: "OsakaStay에서 호텔 검색 가격순으로",
    intent: "modify",
    platformName: "OsakaStay",
  });
  assert(modify.goalKind === "modify", "P1 goalKind modify");
  assert(modify.scope.kind === "existing_platform", "P1 existing scope");

  const gate = runConversationGate({
    utterance: "호텔 예약 플랫폼 만들어줘",
    context: { platformName: "OsakaStay" },
  });
  assert(gate.platformGoal?.goalKind === "create", "P1 gate attaches platformGoal");
  assert(gate.allowPlanner, "P1 planner allowed");

  const summary = summarizePlatformGoal(create);
  assert(summary.startsWith("Create"), "P1 summarizePlatformGoal");
}

function testP2ExplorePlanBridge() {
  const draft = createDefaultPlatformDraft();
  draft.name = "OsakaStay";
  draft.actions = [
    {
      id: "1",
      name: "hotel.search",
      description: "Search",
      inputSchema: "{}",
      outputSchema: "hotel.search.response.v1",
      approvalRequired: false,
    },
  ];

  const goal = compilePlatformGoal({
    utterance: "booking.prepare와 payment.prepare 추가해줘",
    intent: "modify",
    platformName: draft.name,
  });

  const discovery = discoverPlatformContext({ goal, utterance: goal.summary, draft });
  assert(discovery.existingCapabilities.includes("hotel.search"), "P2 existing cap discovery");

  const plan = planPlatformChanges({
    goal,
    discovery,
    draft,
    stripeConnected: false,
  });
  assert(plan.platformSteps.length > 0, "P2→P3 plan has steps");
  assert(plan.phases.includes("build"), "P2 plan includes build phase");
}

function testP5Regression() {
  const before = createDefaultPlatformDraft();
  before.actions = [
    {
      id: "1",
      name: "hotel.search",
      description: "Search",
      inputSchema: "{}",
      outputSchema: "hotel.search.response.v1",
      approvalRequired: false,
    },
  ];
  const after = createDefaultPlatformDraft();
  after.actions = [];

  const regression = detectRegression(before, after);
  assert(regression.detected, "P5 regression detected");
  assert(regression.removedCapabilities.includes("hotel.search"), "P5 removed cap");

  const draft = createDefaultPlatformDraft();
  draft.actions = [
    {
      id: "1",
      name: "payment.commit",
      description: "Commit",
      inputSchema: "{}",
      outputSchema: "invalid",
      approvalRequired: false,
    },
  ];
  const graph = buildIssueGraph({ draft, testFailed: true });
  const repair = planVerifyRepair({ draft, testFailed: true });
  assert(graph.nodes.length >= 1, "P5 issue graph");
  assert(repair.repairSteps.some((s) => s.toolId === "test.run"), "P5 retest in repair");
}

async function testP7Preview() {
  const draft = createDefaultPlatformDraft();
  draft.id = "platform.test";
  draft.actions = [
    {
      id: "1",
      name: "hotel.search",
      description: "Search hotels",
      inputSchema: "{}",
      outputSchema: "hotel.search.response.v1",
      approvalRequired: false,
    },
  ];

  const { verify } = await inspectPreviewWithBrowser(draft);
  assert(verify.checks.length >= 2, "P7 preview checks");
}

function testP9SyncInPlan() {
  const draft = createDefaultPlatformDraft();
  draft.name = "SyncTest";
  const goal = compilePlatformGoal({
    utterance: "호텔 예약 플랫폼 만들어줘",
    intent: "create",
    platformName: draft.name,
  });
  const discovery = discoverPlatformContext({ goal, utterance: goal.summary, draft });
  const plan = planPlatformChanges({ goal, discovery, draft, stripeConnected: false });
  const hasSync = plan.platformSteps.some((s) => s.toolId === "platform.sync");
  assert(hasSync, "P9 platform.sync after mutations");
}

function testP10DevLayout() {
  const idle = resolveDevModeLayout({ hasPlatform: true, agentRunning: false, previewActive: false });
  assert(idle.surfaces.includes("workspace"), "P10 idle workspace");
  assert(!idle.showTerminal, "P10 no terminal when idle");

  const running = resolveDevModeLayout({ hasPlatform: true, agentRunning: true, previewActive: false });
  assert(running.showTerminal, "P10 terminal when agent running");
  assert(running.surfaces.includes("terminal"), "P10 terminal surface");

  const preview = resolveDevModeLayout({ hasPlatform: true, agentRunning: false, previewActive: true });
  assert(preview.surfaces.includes("preview"), "P10 preview surface");
}

async function main() {
  testP0ChatGate();
  testP1PlatformGoal();
  testP2ExplorePlanBridge();
  testP5Regression();
  await testP7Preview();
  testP9SyncInPlan();
  testP10DevLayout();
  console.log("test-hub-phases-p0-p10: all passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
