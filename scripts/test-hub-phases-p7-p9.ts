/**
 * P7–P9 Hub Agent phases — publish flow, multi-provider OAuth, Agent home event SSOT.
 */

import { evaluateToolApproval } from "@/lib/agent/approval";
import {
  applyControllerEventToLog,
  createEmptyAgentEventLog,
  mergeControllerEventToSharedLog,
  readSharedAgentEventLog,
  writeSharedAgentEventLog,
  clearSharedAgentEventLogForTests,
} from "@/lib/agent/events";
import { evaluatePublishGate, executeApprovedPublish } from "@/lib/hub/dev/hub-publish-flow";
import {
  connectActionIdForProvider,
  connectedParamForProvider,
  resumeUtteranceForProvider,
} from "@/lib/hub/dev/hub-oauth-connect";
import {
  setPendingHubLoopResume,
  readPendingHubLoopResume,
  clearPendingHubLoopResume,
  type HubDevConnectionId,
} from "@/lib/hub/dev/hub-connection-store";
import {
  setPendingPublishApproval,
  readPendingPublishApproval,
  clearPendingPublishApproval,
} from "@/lib/hub/dev/hub-publish-pending-store";
import { getHubToolCatalogEntry } from "@/lib/hub/dev/hub-tool-catalog";
import { invokeHubWorkspaceTool } from "@/lib/hub/dev/hub-workspace-tools";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { evaluateCapabilityIndexPublish } from "@/lib/platform-sdk/capability-index";
import { capabilityDraftToPlatformManifest } from "@/lib/hub/capability/manifest-bridge";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testP7PublishFlow() {
  const publish = getHubToolCatalogEntry("publish.request");
  assert(publish?.requiresApproval === true, "publish.request requires approval");

  const approval = evaluateToolApproval({ toolId: "publish.request" });
  assert(approval.decision === "require_approval", "publish approval required");

  const draft = createDefaultPlatformDraft();
  draft.name = "PublishTest";
  draft.securityScanPassed = true;
  draft.actions = [
    {
      id: "1",
      name: "hotel.search",
      description: "Search hotels",
      inputSchema: "hotel.search.v1",
      outputSchema: "hotel.search_result.v1",
      approvalRequired: false,
    },
  ];

  const gateFail = evaluatePublishGate({ draft, testsPassed: false });
  assert(!gateFail.ok, "gate blocks without tests");

  const gatePass = evaluatePublishGate({ draft, testsPassed: true });
  assert(gatePass.manifestValid, "manifest valid");
  assert(gatePass.registeredCount >= 1, "capabilities registered in gate");

  setPendingPublishApproval({
    platformId: draft.id,
    utterance: "publish please",
    gate: gatePass,
  });
  assert(readPendingPublishApproval()?.gate.ok === true, "pending publish stored");
  clearPendingPublishApproval();
}

function testP7IndexV2Gate() {
  const draft = createDefaultPlatformDraft();
  draft.actions = [
    {
      id: "1",
      name: "market.search",
      description: "Search",
      inputSchema: "market.search.v1",
      outputSchema: "market.search_result.v1",
      approvalRequired: false,
    },
  ];
  const manifest = capabilityDraftToPlatformManifest(draft);
  const result = evaluateCapabilityIndexPublish(manifest, "published");
  assert(result.registered.length >= 1, "v2 index evaluate registers");
}

async function testP7PublishTool() {
  const draft = createDefaultPlatformDraft();
  draft.securityScanPassed = true;
  draft.actions = [
    {
      id: "1",
      name: "hotel.search",
      description: "Search",
      inputSchema: "hotel.search.v1",
      outputSchema: "hotel.search_result.v1",
      approvalRequired: false,
    },
  ];
  const snapshot = buildProjectSnapshot({ draft, testsPassed: true });
  const ctx = {
    getDraft: () => draft,
    updateDraft: () => {},
    snapshot,
    executor: {
      getDraft: () => draft,
      updateDraft: () => {},
      runSandboxTest: async () => ({ passed: true }),
    },
    connections: { stripe: false, github: true, vercel: true, openai: true, mcp: false },
  };
  const result = await invokeHubWorkspaceTool("publish.request", {}, ctx);
  assert(result.ok, "publish.request tool ok");
  const data = result.data as { ok: boolean; registeredCount: number };
  assert(data.registeredCount >= 1, "publish.request returns gate");
}

function testP8MultiProviderOAuth() {
  for (const provider of ["stripe", "github", "vercel"] as const) {
    const actionId = connectActionIdForProvider(provider);
    assert(actionId === `connect_${provider}`, `${provider} action id`);
    const param = connectedParamForProvider(provider);
    assert(param?.includes("connected"), `${provider} connected param`);
    assert(resumeUtteranceForProvider(provider).includes("완료"), `${provider} resume utterance`);
  }

  setPendingHubLoopResume({
    utterance: "deploy to vercel",
    platformId: "p1",
    actionId: "connect_vercel",
    provider: "vercel" as HubDevConnectionId,
  });
  const pending = readPendingHubLoopResume();
  assert(pending?.provider === "vercel", "pending loop stores provider");
  clearPendingHubLoopResume();
}

function testP9AgentEventSSOT() {
  clearSharedAgentEventLogForTests();
  let log = createEmptyAgentEventLog();
  log = applyControllerEventToLog(log, { type: "intent", intent: "deploy", executable: true });
  writeSharedAgentEventLog(log);

  const shared = readSharedAgentEventLog();
  assert(shared.events.length === 1, "shared log persisted");

  const merged = mergeControllerEventToSharedLog({
    type: "complete",
    summary: "done",
  });
  assert(merged.events.length >= 2, "merge appends to shared log");
  clearSharedAgentEventLogForTests();
}

async function main() {
  testP7PublishFlow();
  testP7IndexV2Gate();
  await testP7PublishTool();
  testP8MultiProviderOAuth();
  testP9AgentEventSSOT();
  console.log("test-hub-phases-p7-p9: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
