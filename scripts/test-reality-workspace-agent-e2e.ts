/**
 * STEP 8 — Reality Workspace Agent E2E
 *
 * Scenario (Workspace mutations only — no long AI answers):
 *  1. 오사카 여행 만들어 → Workspace 생성
 *  2. 캡슐호텔만 보여줘 → Filter Patch → Projection
 *  3. 난바역 근처 맛집 → Spatial Retrieval → Entity · Relation · Pin · Callout
 *  4. Day2에 넣어 → Draft · Relationship
 *  5. 예약 준비 → Prepare · Commit Pending
 *  6. 승인 → Reality Commit (human only)
 */
import assert from "node:assert/strict";
import {
  AUTO_PROJECTION_STAGES,
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import {
  WORKSPACE_AGENT_LOOP_PHASES,
  applyGlobeWorkspaceAgentTurn,
  runWorkspaceAgentLoop,
} from "@/lib/context-run";
import { publishGlobeProjectionLayerPolicy } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import {
  clearCalloutWindowsForTests,
  listActiveCalloutWindows,
} from "@/lib/callout/windows";
import {
  clearProjectionForTests,
  readProjectionSnapshot,
} from "@/lib/projection-engine";
import {
  clearRealityGraphForTests,
  upsertRealityEntity,
  getRealityEntity,
} from "@/lib/reality-graph";
import {
  clearPreparesForTests,
  readLatestPrepare,
} from "@/lib/prepare-layer";
import {
  clearRealityCommitLedgerForTests,
  clearRealityCommitTransactionsForTests,
  runRealityCommit,
} from "@/lib/reality-commit";

const CTX = "ctx_reality_workspace_agent_e2e";

function lodgingNode(
  id: string,
  title: string,
  tags: readonly string[],
  selected = false,
): ContextWorkspaceNode {
  return {
    id,
    kind: "lodging",
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.665,
    lng: 135.501,
    rating: 4.2,
    priceBand: 2,
    amountLabel: "₩90,000",
    thumbnailUrl: null,
    tags,
    visible: true,
    selected,
    bookmarked: selected,
    source: "seed",
  };
}

function assertOneLineStatus(statusKo: string | null): void {
  assert.ok(statusKo, "status required");
  assert.ok(!statusKo!.includes("\n"), "no essay / multi-line AI answer");
  assert.ok(statusKo!.length <= 72, "status must stay short");
}

function assertLoopPhases(phases: readonly string[]): void {
  assert.deepEqual([...phases], [...WORKSPACE_AGENT_LOOP_PHASES]);
}

// ── Reset ──────────────────────────────────────────────
clearCalloutWindowsForTests();
clearContextWorkspace(CTX);
clearProjectionForTests();
clearRealityGraphForTests();
clearPreparesForTests();
clearRealityCommitLedgerForTests();
clearRealityCommitTransactionsForTests();

void (async () => {
  // 1. 오사카 여행 만들어 → Workspace 생성
  openMapContextWorkspace({
    contextEventId: CTX,
    domain: "lodging",
    query: "오사카 여행 만들어",
    summaryKo: "오사카 여행",
    candidates: [],
  });
  const opened = readContextWorkspace(CTX);
  assert.ok(opened, "step1 · Workspace created");
  assert.equal(opened!.status, "editing");

  writeContextWorkspace({
    ...opened!,
    summaryKo: "오사카 여행",
    nodes: [
      lodgingNode("h_capsule", "난바 캡슐호텔", ["stay:capsule"], true),
      lodgingNode("h_biz", "난바 비즈니스호텔", ["stay:business"]),
      lodgingNode("h_capsule2", "도톤보리 캡슐", ["stay:capsule"]),
    ],
    selectedIds: ["h_capsule"],
    updatedAtIso: new Date().toISOString(),
  });
  writeContextWorkspaceExpanded(CTX, true);
  publishGlobeProjectionLayerPolicy({
    mode: "focus",
    activeContextEventId: CTX,
    visiblePlaceIds: [],
  });

  upsertRealityEntity({
    id: "h_capsule",
    type: "Hotel",
    properties: {
      name: "난바 캡슐호텔",
      priceWon: 90_000,
      priceLabelKo: "₩90,000",
    },
    state: { lifecycle: "candidate", active: true },
  });

  // 2. 캡슐호텔만 보여줘 → Filter Patch → Auto Projection
  const step2 = await runWorkspaceAgentLoop({
    utterance: "캡슐호텔만 보여줘",
    explicitContextEventId: CTX,
  });
  assert.equal(step2.ok, true);
  assert.equal(step2.essayForbidden, true);
  assert.equal(step2.toolId, "workspace_patch");
  assert.equal(step2.patchKind, "filter_entity");
  assertLoopPhases(step2.phases);
  assertOneLineStatus(step2.statusKo);
  assert.ok(step2.projection?.ok);
  assert.equal(step2.projection!.manualRefreshRequired, false);
  assert.deepEqual(
    [...step2.projection!.stages],
    [...AUTO_PROJECTION_STAGES],
  );

  const afterFilter = readContextWorkspace(CTX)!;
  const visible = afterFilter.nodes.filter((n) => n.visible);
  assert.ok(visible.length >= 1);
  assert.ok(visible.every((n) => n.tags.includes("stay:capsule")));
  assert.ok(
    (afterFilter.patches?.length ?? 0) >= 1,
    "step2 · Patch recorded (not Answer)",
  );
  assert.ok(
    afterFilter.patches!.every((p) => p.answerForbidden === true),
    "step2 · answers forbidden on patch records",
  );
  assert.ok(readProjectionSnapshot(CTX), "step2 · projection snapshot");

  // 3. 난바역 근처 맛집 → Spatial Retrieval
  const step3 = await applyGlobeWorkspaceAgentTurn({
    utterance: "난바역 근처 맛집",
    explicitContextEventId: CTX,
  });
  assert.equal(step3.handled, true);
  assert.equal(step3.via, "spatial_discovery");
  assert.equal(step3.committed, false);
  assertOneLineStatus(step3.statusKo);
  assertLoopPhases(step3.phases ?? []);

  const afterSpatial = readContextWorkspace(CTX)!;
  const eateries = afterSpatial.nodes.filter(
    (n) => n.kind === "eatery" && n.visible,
  );
  assert.ok(eateries.length >= 1, "step3 · eatery entities");
  assert.ok(
    (afterSpatial.relationshipEdges?.length ?? 0) >= 1,
    "step3 · relationships",
  );
  // Facet model — no multi floating Callout windows
  assert.equal(listActiveCalloutWindows().length, 0);

  // Select first eatery for Day2 move
  const eateryId = eateries[0]!.id;
  writeContextWorkspace({
    ...readContextWorkspace(CTX)!,
    selectedIds: [eateryId],
    nodes: readContextWorkspace(CTX)!.nodes.map((n) => ({
      ...n,
      selected: n.id === eateryId,
    })),
    updatedAtIso: new Date().toISOString(),
  });

  // 4. Day2에 넣어 → Draft · Relationship
  const step4 = await runWorkspaceAgentLoop({
    utterance: "Day2에 넣어",
    explicitContextEventId: CTX,
  });
  assert.equal(step4.ok, true);
  assert.equal(step4.patchKind, "move_schedule");
  assertOneLineStatus(step4.statusKo);
  assert.ok(step4.statusKo!.includes("Day2") || step4.statusKo!.includes("Draft"));

  const afterDay2 = readContextWorkspace(CTX)!;
  assert.ok(
    afterDay2.realityPlan?.lastEditKo?.includes("day2"),
    "step4 · schedule draft cue",
  );
  assert.ok(
    afterDay2.relationshipEdges?.some(
      (e) => e.labelKo?.includes("Day2") || e.id.includes("day2"),
    ),
    "step4 · relationship updated",
  );

  // Re-select lodging for prepare
  writeContextWorkspace({
    ...readContextWorkspace(CTX)!,
    selectedIds: ["h_capsule"],
    nodes: readContextWorkspace(CTX)!.nodes.map((n) => ({
      ...n,
      selected: n.id === "h_capsule",
      visible: n.kind === "lodging" ? n.tags.includes("stay:capsule") : n.visible,
    })),
    updatedAtIso: new Date().toISOString(),
  });

  // 5. 예약 준비 → Prepare · Commit Pending
  const step5 = await runWorkspaceAgentLoop({
    utterance: "예약 준비",
    explicitContextEventId: CTX,
  });
  assert.equal(step5.ok, true);
  assert.equal(step5.toolId, "reality_prepare");
  assert.equal(step5.commitPending, true);
  assert.equal(step5.waiting, true);
  assertOneLineStatus(step5.statusKo);

  const prepare = readLatestPrepare(CTX);
  assert.ok(prepare, "step5 · prepare object");
  assert.equal(prepare!.status, "ready_for_commit");
  assert.equal(prepare!.entityId, "h_capsule");

  // Agent must NOT commit
  const agentCommit = runRealityCommit({
    source: "agent",
    approval: {
      approved: true,
      approvedAtIso: new Date().toISOString(),
      channel: "field",
    },
    workspaceId: CTX,
    prepareId: prepare!.prepareId,
  });
  assert.equal(agentCommit.ok, false);

  // 6. 승인 → Reality Commit (human)
  const step6 = runRealityCommit({
    source: "field",
    approval: {
      approved: true,
      approvedAtIso: new Date().toISOString(),
      channel: "field",
    },
    workspaceId: CTX,
    prepareId: prepare!.prepareId,
  });
  assert.equal(step6.ok, true, "step6 · Reality Commit");
  if (step6.ok) {
    const entity = getRealityEntity("h_capsule");
    assert.ok(entity);
  }

  // Final: no essay SSOT in workspace
  const finalWs = readContextWorkspace(CTX)!;
  for (const p of finalWs.patches ?? []) {
    assert.equal(p.answerForbidden, true);
    assert.ok(!("answer" in (p as object)));
  }

  clearCalloutWindowsForTests();
  clearContextWorkspace(CTX);
  console.log("ok — Reality Workspace Agent E2E (steps 1–6)");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
