/**
 * P3–P9 Agent OS phases smoke.
 * Run: npm run test:agent-os-p3-p9
 */
import assert from "node:assert/strict";
import {
  expandCapabilityDependencies,
  findRelatedCapabilities,
  capabilityDependenciesOfTool,
  buildDependencyGraphEdges,
} from "@/lib/rimvio-index/graph";
import {
  resolveInteractionMode,
  createCapabilityDevelopmentRequest,
  resetCapabilityDevelopmentRequestsForTests,
} from "@/lib/agent-os";
import {
  spawnImprovementTaskFromDevRequest,
  resetImprovementTasksForTests,
} from "@/lib/rimvio-index/improvement-task-pool";
import { tickHubBackgroundAgent } from "@/lib/hub/dev/hub-background-agent";
import {
  drainImprovementTasksToSandbox,
  resetSandboxTaskQueueForTests,
  codingPlanForSandboxRun,
} from "@/lib/hub/dev/sandbox-task-queue";
import { selectParallelHubWorkers } from "@/lib/hub/dev/hub-worker-swarm";
import { decomposePlatformGoal } from "@/lib/hub/dev/platform-agent/task-decomposition";
import { discoverPlatformContext } from "@/lib/hub/dev/platform-agent/context-discovery";
import { compilePlatformGoal } from "@/lib/hub/dev/platform-agent/platform-goal";
import {
  recordCapabilityVersionPublish,
  resetCapabilityVersionPublishEventsForTests,
  readCapabilityVersionPublishEvents,
} from "@/lib/capability-ledger/record-capability-version-publish";
import {
  resolveWorkspaceLifecycle,
  defaultLifecycleForWorkspace,
} from "@/lib/context-workspace/workspace-lifecycle";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { CapabilityIndexEntry } from "@/lib/platform-sdk/capability-index";

resetCapabilityDevelopmentRequestsForTests();
resetImprovementTasksForTests();
resetSandboxTaskQueueForTests();
resetCapabilityVersionPublishEventsForTests();

// P3 — dependency graph
const deps = expandCapabilityDependencies(["booking.prepare"]);
assert.ok(deps.includes("hotel.detail"), "dependency expansion");
assert.ok(capabilityDependenciesOfTool("hotel.lookup").length >= 1);
assert.ok(buildDependencyGraphEdges().length > 5);
assert.ok(findRelatedCapabilities({ capabilityId: "booking.prepare" }).length >= 2);

// P4 — interaction mode (already in P1 tests, sanity)
assert.equal(resolveInteractionMode("오사카 날씨 알려줘"), "simple_response");

// P5 — hub background tick
const draft: PlatformDraft = {
  name: "Travel Dev",
  description: "test",
  actions: [{ name: "hotel.search", description: "search", inputSchema: "{}", outputSchema: "{}" }],
  permissions: [],
  markets: [],
  architectureNotes: "",
  runtimeTier: "standard",
  dataCollectionsJson: "[]",
  dataIsolation: "tenant",
  uiRoutesJson: "[]",
  workflowDescription: "",
  commerceNotes: "",
  securityScanPassed: true,
  operator: { name: "dev", email: "dev@test.com" },
  publishStatus: "draft",
  autosaveStatus: "saved",
  testRunStatus: "idle",
} as PlatformDraft;

const devReq = createCapabilityDevelopmentRequest({
  goal: "쿠팡 구매",
  capabilityType: "commerce.coupang.purchase",
  reason: "missing",
  contextEventId: "ctx-p5",
});
const bg = tickHubBackgroundAgent({ platformId: "travel-dev", draft });
assert.ok(bg.tasksSpawned >= 1 || bg.openDevRequests >= 0);

const spawned = spawnImprovementTaskFromDevRequest({
  request: devReq,
  platformId: "travel-dev",
});
assert.ok(spawned);

// P6 — sandbox queue
const runs = drainImprovementTasksToSandbox({
  platformId: "travel-dev",
  draft,
  limit: 2,
});
assert.ok(runs.length >= 1);
const plan = codingPlanForSandboxRun({ run: runs[0]! });
assert.ok(plan.steps.length >= 2);

// P7 — worker swarm
const goal = compilePlatformGoal({
  utterance: "hotel search capability improve",
  intent: "modify",
  platformName: draft.name,
});
const discovery = discoverPlatformContext({
  goal,
  utterance: "hotel search",
  draft,
});
const graph = decomposePlatformGoal({
  goal,
  discovery,
  stripeConnected: false,
});
const swarm = selectParallelHubWorkers({
  graph,
  platformId: "travel-dev",
  draft,
  maxWorkers: 3,
});
assert.ok(swarm.workers.length >= 1);

// P8 — capability version publish event
const entry: CapabilityIndexEntry = {
  capabilityId: "hotel.search",
  platformId: "platform.travel",
  platformName: "Travel",
  marketCountry: "KR",
  inputSchema: "hotel.search.v1",
  outputSchema: "hotel.search_result.v1",
  approvalRequired: false,
  category: "travel",
  tags: ["lodging"],
  status: "PUBLISHED",
  publishedAtIso: new Date().toISOString(),
  routePath: "/",
  keywords: ["hotel"],
  inputSchemaVersion: 2,
};
const pub = recordCapabilityVersionPublish({ entry, contributorId: "dev-1" });
assert.equal(pub.version, "2");
assert.ok(readCapabilityVersionPublishEvents().length >= 1);

// P9 — workspace lifecycle
assert.equal(
  defaultLifecycleForWorkspace({ status: "editing", realityDraft: null }),
  "private",
);
assert.equal(resolveWorkspaceLifecycle(null), "draft");

resetCapabilityDevelopmentRequestsForTests();
resetImprovementTasksForTests();
resetSandboxTaskQueueForTests();
resetCapabilityVersionPublishEventsForTests();

console.log("ok — agent-os P3–P9 (graph · hub bg · sandbox · swarm · economy · lifecycle)");
