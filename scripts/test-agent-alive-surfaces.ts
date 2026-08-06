/**
 * Agent alive surfaces — Diff status + stage tape + vague clarify.
 * Run: npx tsx scripts/test-agent-alive-surfaces.ts
 */
import assert from "node:assert/strict";
import {
  beginAgentProductTurn,
  clearLastAgentProductTurnForTests,
  composeAgentVagueClarifyFromWorkspace,
  composeAgentVagueClarifyKo,
  readLastAgentProductTurn,
  runWorkspaceAgentLoop,
} from "@/lib/context-run";
import { readAgentRuntimeProjection } from "@/lib/context-run/agent-runtime-projection";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";

const CTX = "ctx-agent-alive";

function lodging(id: string, title: string): ContextWorkspaceNode {
  return {
    id,
    kind: "lodging",
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.66,
    lng: 135.5,
    rating: 4.2,
    priceBand: 2,
    amountLabel: "₩90,000",
    thumbnailUrl: null,
    tags: ["stay:hotel"],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "seed",
  };
}

{
  const withCtx = composeAgentVagueClarifyKo("이거 어때?", {
    destinationKo: "오사카",
    visibleLodging: 3,
    visibleEatery: 0,
    visibleTotal: 3,
  });
  assert.ok(withCtx.includes("오사카"));
  assert.ok(withCtx.includes("숙소 3") || withCtx.includes("1번"));
  assert.ok(!withCtx.includes("Patch"));
}

clearContextWorkspace(CTX);
clearLastAgentProductTurnForTests();
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "lodging",
  query: "난바 호텔",
  summaryKo: "오사카 여행",
  candidates: [],
  source: "scout_patch",
});
writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes: [lodging("h1", "난바 호텔 A"), lodging("h2", "난바 호텔 B")],
  constraintMemory: {
    destinationKo: "오사카",
    stayType: null,
    maxNightlyKrw: null,
    minRating: null,
    nearbyAnchorKo: null,
    preferTransit: null,
    notes: [],
    updatedAtIso: new Date().toISOString(),
  },
  updatedAtIso: new Date().toISOString(),
});
writeContextWorkspaceExpanded(CTX, true);

beginAgentProductTurn({
  contextEventId: CTX,
  utterance: "이거 어때?",
});

{
  const clarify = composeAgentVagueClarifyFromWorkspace({
    utterance: "이거 어때?",
    contextEventId: CTX,
  });
  assert.ok(clarify.includes("오사카") || clarify.includes("숙소"));
}

void (async () => {
  const miss = await runWorkspaceAgentLoop({
    utterance: "음…",
    explicitContextEventId: CTX,
  });
  assert.equal(miss.ok, false);
  assert.ok(miss.statusKo);
  assert.ok(!miss.statusKo!.includes("Patch 없음"));
  assert.ok(
    miss.statusKo!.includes("작업장") ||
      miss.statusKo!.includes("오사카") ||
      miss.statusKo!.includes("더 싸게") ||
      miss.statusKo!.includes("손"),
  );

  clearLastAgentProductTurnForTests();
  beginAgentProductTurn({
    contextEventId: CTX,
    utterance: "더 싸게",
  });
  const refine = await runWorkspaceAgentLoop({
    utterance: "더 싸게",
    explicitContextEventId: CTX,
  });
  assert.ok(refine.ok || refine.workspaceMutated || refine.statusKo);
  assert.ok(refine.statusKo);
  assert.ok(!refine.statusKo!.includes("Patch 없음"));

  const turn = readLastAgentProductTurn();
  assert.ok(turn?.contextEventId === CTX);
  if (refine.workspaceMutated || refine.ok) {
    assert.ok(
      turn!.stagesCompleted.includes("agent_status") ||
        turn!.stagesCompleted.includes("workspace_patch") ||
        turn!.stagesCompleted.includes("projection"),
      `stages=${turn!.stagesCompleted.join(",")}`,
    );
  }

  const proj = readAgentRuntimeProjection(CTX);
  assert.ok(proj);
  assert.ok((proj!.workLog?.length ?? 0) >= 2 || proj!.statusKo);

  console.log("ok — agent alive surfaces (clarify + stage tape)");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
