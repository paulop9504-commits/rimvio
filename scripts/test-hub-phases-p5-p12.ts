/**
 * P5–P12 Hub Agent phases — verify-repair, checkpoint, preview, sync, dev mode.
 */

import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import {
  buildIssueGraph,
  planRepairStepsFromGraph,
  planVerifyRepair,
} from "@/lib/hub/dev/hub-verify-repair";
import {
  clearHubCheckpointsForTests,
  createHubCheckpoint,
  rollbackToHubCheckpoint,
  undoHubCheckpoint,
  CHECKPOINT_MUTATING_TOOLS,
} from "@/lib/hub/dev/hub-checkpoint-store";
import { verifyPreviewState } from "@/lib/hub/dev/preview-agent-verify";
import type { SandboxPreviewState } from "@/lib/hub/dev/sandbox-preview";
import {
  applySourcePatchToDraft,
  exportDraftToSourceFiles,
  syncPlatformBidirectional,
} from "@/lib/hub/dev/platform-source-sync";
import { planComputerUse, resolveDevModeLayout } from "@/lib/hub/dev/developer-mode";
import { invokeHubWorkspaceTool } from "@/lib/hub/dev/hub-workspace-tools";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { readPendingPublishApproval } from "@/lib/hub/dev/hub-publish-pending-store";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testP5VerifyRepair() {
  const draft = createDefaultPlatformDraft();
  draft.actions = [
    {
      id: "1",
      name: "payment.commit",
      description: "Commit payment",
      inputSchema: "{}",
      outputSchema: "invalid",
      approvalRequired: false,
    },
  ];

  const graph = buildIssueGraph({ draft, testFailed: true, testDetail: "0/1 passed" });
  assert(graph.nodes.length >= 2, "issue graph has schema + test nodes");

  const plan = planVerifyRepair({ draft, testFailed: true });
  assert(plan.repairSteps.length >= 2, "repair steps include retest");
  assert(plan.repairSteps.some((s) => s.toolId === "schema.update"), "schema repair");
  assert(plan.repairSteps.some((s) => s.toolId === "test.run"), "retest step");
}

function testP6Checkpoint() {
  clearHubCheckpointsForTests();
  const draft = createDefaultPlatformDraft();
  draft.name = "CheckpointTest";

  const cp = createHubCheckpoint({ platformId: draft.id, label: "before mutate", draft });
  assert(cp.id.startsWith("cp-"), "checkpoint id");

  draft.name = "Mutated";
  const restored = rollbackToHubCheckpoint(cp.id);
  assert(restored?.name === "CheckpointTest", "rollback restores draft");

  createHubCheckpoint({ platformId: draft.id, label: "second", draft: createDefaultPlatformDraft() });
  const undone = undoHubCheckpoint(draft.id);
  assert(undone !== null, "undo returns draft");

  assert(CHECKPOINT_MUTATING_TOOLS.has("schema.update"), "schema.update checkpoints");
  clearHubCheckpointsForTests();
}

function testP7PreviewVerify() {
  const draft = createDefaultPlatformDraft();
  draft.id = "platform.test";
  draft.actions = [
    {
      id: "1",
      name: "hotel.search",
      description: "Search",
      inputSchema: "{}",
      outputSchema: "hotel.search_result.v1",
      approvalRequired: false,
    },
  ];

  const state: SandboxPreviewState = {
    mode: "sandbox",
    platformId: draft.id,
    invokeOk: true,
    invokeDetail: "ok",
    hotels: [{ id: "h1", name: "Test", rating: 4.5, priceKrw: 100_000, nights: 2 }],
  };

  const verify = verifyPreviewState(state, draft);
  assert(verify.ok, "preview verify pass");

  const fail = verifyPreviewState({ ...state, invokeOk: false }, draft);
  assert(!fail.ok, "preview verify fails on invoke");
}

function testP8PublishApprovalPending() {
  const pending = readPendingPublishApproval();
  assert(pending === null || typeof pending?.platformId === "string", "publish pending readable");
}

async function testP9SourceSync() {
  const draft = createDefaultPlatformDraft();
  draft.actions = [
    {
      id: "1",
      name: "hotel.search",
      description: "Search hotels",
      inputSchema: '{"type":"object"}',
      outputSchema: "hotel.search_result.v1",
      approvalRequired: false,
    },
  ];

  const exported = exportDraftToSourceFiles(draft);
  assert(exported.length >= 2, "export source files");

  const schemaFile = exported.find((f) => f.path.includes("/schemas/"));
  assert(schemaFile, "schema file exported");

  const patched = applySourcePatchToDraft(
    draft,
    schemaFile!.path,
    JSON.stringify({
      input: '{"type":"object","properties":{"q":{"type":"string"}}}',
      output: "hotel.search_result.v2",
    }),
  );
  assert(patched.ok, "source patch applies");
  assert(patched.patch.actions?.[0]?.outputSchema.includes("v2"), "schema updated from source");

  const sync = syncPlatformBidirectional({
    draft,
    inboundFiles: [
      {
        path: schemaFile!.path,
        content: JSON.stringify({ output: "hotel.search_result.v2" }),
        kind: "schema",
        objectId: "hotel.search.schema",
      },
    ],
  });
  assert(sync.syncedPaths.length >= 1 || sync.files.length >= 2, "bidirectional sync");
}

async function testP9PlatformSyncTool() {
  const draft = createDefaultPlatformDraft();
  draft.actions = [
    {
      id: "1",
      name: "hotel.search",
      description: "Search",
      inputSchema: "{}",
      outputSchema: "hotel.search_result.v1",
      approvalRequired: false,
    },
  ];
  const snapshot = buildProjectSnapshot({ draft });
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
  const result = await invokeHubWorkspaceTool("platform.sync", { direction: "export" }, ctx);
  assert(result.ok, "platform.sync export");
}

function testP10DevMode() {
  const layout = resolveDevModeLayout({
    hasPlatform: true,
    agentRunning: true,
    previewActive: false,
  });
  assert(layout.showTerminal, "terminal when agent running");

  const cu = planComputerUse("preview 열고 확인");
  assert(cu.actions.length >= 2, "computer use preview plan");

  const blocked = planComputerUse("random task");
  assert(blocked.status === "blocked", "computer use blocked without browser");
}

async function main() {
  testP5VerifyRepair();
  testP6Checkpoint();
  testP7PreviewVerify();
  testP8PublishApprovalPending();
  await testP9SourceSync();
  await testP9PlatformSyncTool();
  testP10DevMode();
  console.log("test-hub-phases-p5-p12: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
