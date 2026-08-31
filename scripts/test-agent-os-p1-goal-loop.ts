/**
 * P1 Main Agent goal loop smoke — interaction mode + dynamic capability loop.
 * Run: npm run test:agent-os-p1
 */
import assert from "node:assert/strict";
import {
  resolveInteractionMode,
  shouldUseWorkspace,
  selectNextCapabilityFromState,
  MAIN_AGENT_LOOP_LIMITS,
} from "@/lib/agent-os";
import { executeDomainAgentTask } from "@/lib/agent-orchestrator";
import type { AgentObservation } from "@/lib/agent/types";
import {
  ensureSessionGraph,
  resetGraphCommandStoreForTests,
} from "@/lib/graph-command/session-graph-store";

async function main() {
  resetGraphCommandStoreForTests();

  assert.equal(resolveInteractionMode("오사카 날씨 어때?"), "simple_response");
  assert.equal(shouldUseWorkspace("simple_response"), false);

  assert.equal(
    resolveInteractionMode("오사카 호텔 예약하고 싶어."),
    "interactive_workspace",
  );

  assert.equal(
    resolveInteractionMode("오사카 4박5일 여행 계획하고 예약까지 관리해줘."),
    "persistent_workspace",
  );

  const hotelPick = selectNextCapabilityFromState({
    agentId: "lodging",
    utterance: "오사카 호텔 찾아줘",
    contextEventId: "ctx-p1-hotel",
    observations: [],
    lastToolId: null,
    lastVerified: false,
  });
  assert.equal(hotelPick.toolId, "hotel.lookup");

  const afterLookup: AgentObservation = {
    planId: "ctx-p1-hotel",
    stepId: "task:hotel.lookup",
    stepKind: "resolve_entity",
    success: true,
    candidates: [{ id: "h1", labelKo: "Hotel A" }],
  };
  const rankPick = selectNextCapabilityFromState({
    agentId: "lodging",
    utterance: "오사카 호텔 찾아줘",
    contextEventId: "ctx-p1-hotel",
    observations: [afterLookup],
    lastToolId: "hotel.lookup",
    lastVerified: true,
  });
  assert.equal(rankPick.toolId, "ranking.pick");

  const failedLookup: AgentObservation = {
    planId: "ctx-p1-fail",
    stepId: "task:hotel.lookup",
    stepKind: "resolve_entity",
    success: false,
    errors: ["empty_candidates"],
  };
  const retryPick = selectNextCapabilityFromState({
    agentId: "lodging",
    utterance: "오사카 호텔 찾아줘",
    contextEventId: "ctx-p1-fail",
    observations: [failedLookup],
    lastToolId: "hotel.lookup",
    lastVerified: false,
  });
  assert.equal(retryPick.toolId, "hotel.lookup");

  const CTX = "ctx-p1-domain-loop";
  ensureSessionGraph({ contextEventId: CTX });

  const execResult = await executeDomainAgentTask({
    task: {
      nodeId: "lodging-1",
      agentId: "lodging",
      label: "오사카 호텔",
      contextEventId: CTX,
      parameters: { utterance: "오사카 호텔 찾아줘" },
    },
    utterance: "오사카 호텔 찾아줘",
  });

  assert.ok(
    ["completed", "needs_next_action", "needs_user", "blocked"].includes(
      execResult.status,
    ),
    `domain loop status: ${execResult.status}`,
  );
  assert.ok(execResult.observations.length >= 1, "observations recorded");
  if (execResult.status === "blocked") {
    assert.ok(
      execResult.reason?.includes("한도") ||
        execResult.observation.errors?.includes("empty_candidates") ||
        execResult.observations.length >= 1,
      "blocked after observe→act loop",
    );
  }

  assert.ok(MAIN_AGENT_LOOP_LIMITS.MAX_ITERATIONS >= 8);

  console.log(
    "ok — agent-os P1 goal loop (interaction mode · dynamic capability · domain execute)",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
