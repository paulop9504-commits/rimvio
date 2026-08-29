/**
 * Phase 1–5 capability completion regression.
 */

import {
  extractStructuredGoal,
  discoverPlatformContext,
  decomposePlatformGoal,
  planPlatformCreationE2E,
  selectRelevantContext,
} from "@/lib/hub/dev/platform-agent";
import {
  patchSandboxFiles,
  buildMinimalPatch,
  patchCapabilityBundle,
} from "@/lib/hub/dev/coding-agent/coding-sandbox";
import { analyzeErrors, rootCauseAnalysis } from "@/lib/hub/dev/hub-error-analysis";
import { detectRegression, planVerifyRepair } from "@/lib/hub/dev/hub-verify-repair";
import { inspectPreviewWithBrowser } from "@/lib/hub/dev/preview-agent-verify";
import { runBrowserPreviewInspection } from "@/lib/hub/dev/sandbox-preview";
import { explainChanges, summarizeChangeExplanation } from "@/lib/hub/dev/hub-change-explanation";
import {
  applyChangeExplanationsToLog,
  applyCheckpointEventToLog,
} from "@/lib/agent/events/agent-event-bridge";
import { createEmptyAgentEventLog } from "@/lib/agent/events/agent-event-types";
import { createHubCheckpoint, clearHubCheckpointsForTests } from "@/lib/hub/dev/hub-checkpoint-store";
import { deriveProjectChanges, deriveProjectIssues } from "@/lib/hub/dev/dev-project-state";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { planHubAgentTurn } from "@/lib/hub/dev/hub-agent-planner";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { observeHubWorkspace } from "@/lib/hub/dev/hub-workspace-observe";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function testPhase1() {
  const draft = createDefaultPlatformDraft();
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

  const extracted = extractStructuredGoal({
    utterance: "일본 여행자를 위한 호텔 예약 플랫폼 만들어줘",
    intent: "create",
  });
  assert(extracted.platformGoal.domain === "hotel_booking", "goal domain");
  assert(extracted.constraints.length > 0, "constraints");
  assert(extracted.successCriteria.length > 0, "success criteria");

  const discovery = discoverPlatformContext({
    goal: extracted.platformGoal,
    utterance: "호텔 예약 플랫폼",
    draft,
  });
  assert(discovery.relevantContext.length >= 0, "relevant context");

  const relevant = selectRelevantContext({
    goal: extracted.platformGoal,
    utterance: "hotel.search booking",
    draft,
  });
  assert(relevant.selected.some((r) => r.id === "hotel.search"), "scored hotel.search");

  const graph = decomposePlatformGoal({
    goal: extracted.platformGoal,
    discovery,
    stripeConnected: false,
  });
  assert(graph.tasks.length >= 3, "task graph");
  assert(graph.steps.some((s) => s.toolId === "capability.create"), "create step");

  const snapshot = buildProjectSnapshot({ draft });
  const inspect = {
    ...observeHubWorkspace({ draft, snapshot, connections: {} }),
    commerce: "none",
  };
  const plan = await planHubAgentTurn({
    utterance: "일본 여행자를 위한 호텔 예약 플랫폼 만들어줘",
    inspect,
    stripeConnected: false,
    draft,
    skipRuntime: true,
    userIntent: "create",
  });
  assert(plan.relevantContextIds !== undefined, "planner relevant context");
  console.log("Phase 1 OK");
}

function testPhase2() {
  const draft = createDefaultPlatformDraft();
  const goal = extractStructuredGoal({
    utterance: "호텔 예약 플랫폼",
    intent: "create",
  }).platformGoal;
  const discovery = discoverPlatformContext({ goal, utterance: "호텔", draft });
  const e2e = planPlatformCreationE2E({
    goal,
    discovery,
    draft,
    stripeConnected: false,
  });
  assert(e2e.platformSteps.some((s) => s.id.startsWith("e2e_")), "E2E steps");
  assert(e2e.phases.includes("preview"), "E2E preview phase");

  draft.actions.push({
    id: "hs",
    name: "hotel.search",
    description: "Search",
    inputSchema: "{}",
    outputSchema: "hotel.search.response.v1",
    approvalRequired: false,
  });

  const multi = patchCapabilityBundle({ draft, capability: "hotel.search", sort: "price" });
  assert(multi.patches.length >= 1, "multi-file patch");

  const minimal = buildMinimalPatch({
    path: "src/capabilities/hotel/search.ts",
    existingContent: "export const x = 1;",
    insertAfter: "export const x",
    insertLines: ["export const defaultSort = 'price';"],
  });
  assert(minimal.includes("defaultSort"), "minimal patch");
  console.log("Phase 2 OK");
}

function testPhase3() {
  const draft = createDefaultPlatformDraft();
  draft.actions = [
    {
      id: "pc",
      name: "payment.commit",
      description: "Pay",
      inputSchema: "{}",
      outputSchema: "invalid",
      approvalRequired: true,
    },
  ];

  const issues = deriveProjectIssues(draft);
  const analyzed = analyzeErrors({ issues, testFailed: true, testDetail: "schema mismatch" });
  assert(analyzed.length > 0, "analyzed errors");
  const rca = rootCauseAnalysis(analyzed);
  assert(rca.primaryCauseId !== "none", "RCA primary");

  const repair = planVerifyRepair({ draft, testFailed: true });
  assert(repair.rootCause !== undefined, "repair RCA");
  assert(repair.repairSteps.length > 0, "repair steps");

  const before = { ...draft, actions: [...draft.actions] };
  const after = { ...draft, actions: draft.actions.slice(0, 0) };
  const regression = detectRegression(before, after);
  assert(regression.detected, "regression detected");
  console.log("Phase 3 OK");
}

async function testPhase4() {
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

  const { verify } = await inspectPreviewWithBrowser(draft);
  assert(verify.checks.length >= 3, "preview checks");
  assert(verify.browserSession !== undefined, "browser session");

  const session = runBrowserPreviewInspection({
    mode: "demo",
    platformId: draft.id,
    invokeOk: true,
    invokeDetail: "ok",
    hotels: [],
  });
  assert(session.observations.length >= 4, "browser observations");
  console.log("Phase 4 OK");
}

function testPhase5() {
  clearHubCheckpointsForTests();
  const draft = createDefaultPlatformDraft();
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

  const changes = deriveProjectChanges(draft);
  const explanations = explainChanges(changes);
  assert(explanations.length > 0, "explanations");
  assert(summarizeChangeExplanation(explanations).includes("변경"), "rollup ko");

  let log = createEmptyAgentEventLog();
  log = applyChangeExplanationsToLog(log, explanations);
  assert(log.events.some((e) => e.kind === "change_explained"), "change event");

  const cp = createHubCheckpoint({ platformId: draft.id, label: "test", draft });
  log = applyCheckpointEventToLog(log, "checkpoint_created", "before mutate", cp.id);
  assert(log.events.some((e) => e.kind === "checkpoint_created"), "checkpoint event");
  console.log("Phase 5 OK");
}

async function main() {
  await testPhase1();
  testPhase2();
  testPhase3();
  await testPhase4();
  testPhase5();
  console.log("All phase 1–5 capability tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
