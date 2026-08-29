/**
 * Hub Agent Loop — Observe → Plan → Execute → Verify → Replan
 */

import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { runHubAgentLoop, resumeHubAgentLoop } from "@/lib/hub/dev/hub-agent-loop";
import { invokeHubWorkspaceTool } from "@/lib/hub/dev/hub-workspace-tools";
import { planHubAgentTurnRegex } from "@/lib/hub/dev/hub-agent-planner";
import { enterHubAgentRuntimeTurn } from "@/lib/hub/dev/hub-agent-runtime-ingress";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DeployExecutorCallbacks } from "@/lib/hub/deploy/hub-deploy-runtime";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function makeExecutor(initial: PlatformDraft): {
  executor: DeployExecutorCallbacks;
  getDraft: () => PlatformDraft;
} {
  let draft = initial;
  const executor: DeployExecutorCallbacks = {
    mode: "platform",
    getDraft: () => draft,
    updateDraft: (patch) => {
      draft = { ...draft, ...patch } as PlatformDraft;
    },
    runSandboxTest: async () => {
      const hasCommit = draft.actions.some((a) => a.name === "payment.commit");
      const commitOk = draft.actions.find((a) => a.name === "payment.commit")?.inputSchema.includes("approvalToken");
      if (hasCommit && !commitOk) {
        return { passed: false };
      }
      const total = Math.max(1, draft.actions.length);
      return { passed: true };
    },
    onPublishSuccess: () => {},
    onGoToStep: () => {},
  };
  return { executor, getDraft: () => draft };
}

async function testWorkspaceInspect() {
  const draft = createDefaultPlatformDraft();
  draft.name = "OsakaStay";
  draft.actions = [
    {
      id: "1",
      name: "hotel.search",
      description: "Search hotels",
      inputSchema: "{}",
      outputSchema: "{}",
      approvalRequired: false,
    },
  ];
  const snapshot = buildProjectSnapshot({ draft });
  const { executor } = makeExecutor(draft);
  const result = await invokeHubWorkspaceTool(
    "workspace.inspect",
    {},
    {
      getDraft: () => draft,
      updateDraft: executor.updateDraft,
      snapshot,
      executor,
      connections: {},
    },
  );
  assert(result.ok, "inspect should succeed");
  const data = result.data as { capabilities: string[] };
  assert(data.capabilities.includes("hotel.search"), "should list hotel.search");
}

async function testStripeFlowPausesForConnect() {
  const draft = createDefaultPlatformDraft();
  draft.name = "OsakaStay";
  draft.actions = [
    {
      id: "1",
      name: "booking.confirm",
      description: "Confirm booking",
      inputSchema: "{}",
      outputSchema: "{}",
      approvalRequired: true,
    },
  ];
  const snapshot = buildProjectSnapshot({ draft });
  const { executor } = makeExecutor(draft);
  const events: string[] = [];

  const result = await runHubAgentLoop({
    utterance: "OsakaStay에 Stripe 결제 추가해줘",
    draft,
    snapshot,
    executor,
    stripeConnected: false,
    skipRuntimeIngress: true,
    onEvent: (e) => events.push(e.type),
  });

  assert(result.pausedForUser, "should pause for Stripe connect");
  assert(events.includes("observe"), "should observe");
  assert(events.includes("ask_user"), "should ask user");
}

async function testStripeFlowCompletesAfterConnect() {
  const draft = createDefaultPlatformDraft();
  draft.name = "OsakaStay";
  draft.actions = [
    {
      id: "1",
      name: "booking.confirm",
      description: "Confirm booking",
      inputSchema: "{}",
      outputSchema: "{}",
      approvalRequired: true,
    },
  ];
  const snapshot = buildProjectSnapshot({ draft });
  const { executor, getDraft } = makeExecutor(draft);
  const events: string[] = [];

  const result = await resumeHubAgentLoop({
    utterance: "Stripe 연결 완료",
    draft,
    snapshot,
    executor,
    stripeConnected: true,
    skipRuntimeIngress: true,
    onEvent: (e) => events.push(e.type),
  });

  assert(result.ok || getDraft().actions.some((a) => a.name === "payment.prepare"), "should add payment caps");
  assert(events.includes("test_result"), "should run tests");
  assert(events.includes("complete"), "should complete");
}

async function testExtendedTools() {
  const draft = createDefaultPlatformDraft();
  draft.name = "WorkflowTest";
  draft.actions = [
    {
      id: "1",
      name: "booking.confirm",
      description: "Confirm",
      inputSchema: "{}",
      outputSchema: "{}",
      approvalRequired: true,
    },
  ];
  const snapshot = buildProjectSnapshot({ draft });
  const { executor, getDraft } = makeExecutor(draft);
  const ctx = {
    getDraft,
    updateDraft: executor.updateDraft,
    snapshot,
    executor,
    connections: { stripe: false },
  };

  const wf = await invokeHubWorkspaceTool(
    "workflow.create",
    { description: "prepare → approve → commit" },
    ctx,
  );
  assert(wf.ok, "workflow.create should succeed");
  assert(getDraft().workflowDescription.includes("prepare"), "workflow description saved");

  const schema = await invokeHubWorkspaceTool(
    "schema.update",
    { capability: "booking.confirm", inputSchema: '{"type":"object"}' },
    ctx,
  );
  assert(schema.ok, "schema.update should succeed");
}

async function testRuntimeIngress() {
  const runtime = enterHubAgentRuntimeTurn({
    utterance: "Stripe 결제 추가",
    platformId: "test-platform",
  });
  assert(runtime.contextEventId.includes("hub:workspace"), "hub context id");
  assert(runtime.strategy.length > 0, "strategy set");
}

async function testStructuredPlanner() {
  const inspect = {
    platformName: "OsakaStay",
    capabilities: ["booking.confirm"],
    commerce: "None",
    permissions: [],
    issuesCount: 0,
    testsPassed: 0,
    testsTotal: 1,
  };
  const steps = planHubAgentTurnRegex("Stripe 결제 workflow 추가", inspect, false);
  assert(steps.some((s) => s.toolId === "connection.list"), "payment plan includes connections");
  assert(steps.some((s) => s.toolId === "workflow.create"), "workflow utterance adds workflow step");
}

async function main() {
  await testWorkspaceInspect();
  await testStripeFlowPausesForConnect();
  await testStripeFlowCompletesAfterConnect();
  await testExtendedTools();
  await testRuntimeIngress();
  await testStructuredPlanner();
  console.log("test-hub-agent-loop: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
