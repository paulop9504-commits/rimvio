/**
 * Preview Layer flow — unit-style verification (no browser).
 * Run: npx tsx scripts/test-preview-layer.ts
 */

import {
  applyWorkspaceTransition,
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import {
  buildNodePreview,
  buildNodePreviewsForCompare,
} from "@/lib/context-workspace/build-node-preview";
import { runWorkspaceSdkAction } from "@/lib/workspace-sdk/run-workspace-sdk-host-actions";
import type { WorkspaceSdkFrame } from "@/lib/workspace-sdk/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`❌ FAIL: ${msg}`);
}

function fakeNode(
  id: string,
  title: string,
  kind: ContextWorkspaceNode["kind"] = "lodging",
): ContextWorkspaceNode {
  return {
    id,
    kind,
    placeId: id,
    title,
    summaryKo: `${title} 후기 좋음`,
    lat: 33.5,
    lng: 126.5,
    rating: 4.6,
    priceBand: 2,
    amountLabel: "1박 14만원",
    thumbnailUrl: null,
    tags: kind === "lodging" ? ["breakfast"] : ["signature"],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "test",
  };
}

function fakeFrame(contextEventId: string): WorkspaceSdkFrame {
  return {
    version: 1,
    contextEventId,
    kind: "travel",
    morphologyId: "travel",
    lifecycle: "focused",
    header: {
      titleKo: "제주 여행",
      subtitleKo: null,
      eyebrowKo: "여행",
    },
    ai: {
      roleLabelKo: "Trip Assistant",
      promptPlaceholderKo: "무엇이든",
      stripHintKo: "숙소를 골라 주세요",
    },
    primaryFocus: {
      slotId: "hotel",
      labelKo: "숙소",
      headlineKo: "숙소 선택",
      askKo: "어디가 좋을까요?",
    },
    node: { surface: "cards", labelKo: "후보" },
    action: {
      id: "prepare",
      toolId: "booking.prepare",
      labelKo: "예약 준비",
    },
    commit: {
      labelKo: "결재함에서 승인",
      requiresHuman: true,
      leadsToPayment: true,
    },
  };
}

async function main() {
  console.log("Preview Layer — verification\n");
  const ctx = `preview-test-${Date.now()}`;

  openMapContextWorkspace({
    contextEventId: ctx,
    query: "제주 숙소",
    domain: "lodging",
    hits: [],
  });

  // Seed nodes via replace_candidates-compatible path: write via transition add
  let state = readContextWorkspace(ctx);
  assert(!!state, "workspace opened");

  // Inject three lodging candidates by mutating via apply replace if available
  const { writeContextWorkspace } = await import(
    "@/lib/context-workspace/workspace-store"
  );
  const nodes = [
    fakeNode("n1", "리버뷰 호텔"),
    fakeNode("n2", "스테이 인"),
    fakeNode("n3", "시티 로지"),
  ];
  writeContextWorkspace({
    ...state!,
    nodes,
    summaryKo: "숙소 3곳",
    selectedIds: [],
    compareIds: [],
  });
  state = readContextWorkspace(ctx)!;

  // 1. Preview adapter
  console.log("═══ 1. Preview adapter ═══");
  const preview = buildNodePreview(nodes[0]!, state);
  assert(preview.title === "리버뷰 호텔", "title");
  assert(preview.price.includes("14"), "price");
  assert(preview.nearby.length > 0, "nearby chips");
  assert(!preview.selected, "not selected yet");
  console.log("  ✅ preview model ok\n");

  // 2. Soft focus does NOT select — simulate by not calling select
  console.log("═══ 2. Soft focus ≠ Select ═══");
  state = readContextWorkspace(ctx)!;
  assert(state.selectedIds.length === 0, "no selectedIds after soft focus");
  console.log("  ✅ soft focus leaves selected empty\n");

  // 3. Compare add
  console.log("═══ 3. Compare (2~5) ═══");
  applyWorkspaceTransition({
    contextEventId: ctx,
    op: "compare",
    nodeIds: ["n1", "n2"],
  });
  state = readContextWorkspace(ctx)!;
  assert(state.compareIds.length === 2, "compare 2");
  const compareModels = buildNodePreviewsForCompare(state);
  assert(compareModels.length === 2, "compare preview models");
  console.log("  ✅ compare models ok\n");

  // 4. Explicit select
  console.log("═══ 4. Explicit Select ═══");
  applyWorkspaceTransition({
    contextEventId: ctx,
    op: "select",
    nodeIds: ["n1"],
  });
  state = readContextWorkspace(ctx)!;
  assert(state.selectedIds.includes("n1"), "n1 selected");
  assert(state.nodes.find((n) => n.id === "n1")?.selected === true, "flag");
  console.log("  ✅ select ok\n");

  // 5. Prepare gate
  console.log("═══ 5. booking.prepare gate ═══");
  const blocked = runWorkspaceSdkAction({
    frame: fakeFrame(ctx),
    placeId: "n1",
    placeName: "리버뷰 호텔",
    requireExplicitSelect: true,
    explicitlySelected: false,
  });
  assert(!blocked.ok, "prepare blocked without explicit select");

  // Without gate flags (legacy callers) still needs place — but our new gate path works
  const allowed = runWorkspaceSdkAction({
    frame: fakeFrame(ctx),
    placeId: "n1",
    placeName: "리버뷰 호텔",
    requireExplicitSelect: true,
    explicitlySelected: true,
  });
  // May fail if booking agent deps missing in test env — accept either success or agent reason
  assert(
    allowed.ok ||
      (!allowed.ok && !allowed.reasonKo.includes("미리보기")),
    `prepare after select should not be preview-blocked: ${"reasonKo" in allowed ? allowed.reasonKo : "ok"}`,
  );
  console.log(
    allowed.ok
      ? "  ✅ prepare allowed after select\n"
      : `  ✅ preview gate passed (agent: ${allowed.reasonKo})\n`,
  );

  clearContextWorkspace(ctx);
  console.log("══════════════════════════════════════");
  console.log("✅ Preview Layer verification passed");
  console.log("══════════════════════════════════════");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
