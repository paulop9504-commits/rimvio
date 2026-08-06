/**
 * Smoke: SPATIAL_DISCOVERY Tool Router → Workspace Patch
 * "난바 호텔 기준 맛집" → Anchor → Nearby → Relations → Pins → Callout
 */
import assert from "node:assert/strict";
import { bindSituation } from "@/lib/context-run/bind-situation";
import { planContextRun } from "@/lib/context-run/plan-context-run";
import { applyGlobeWorkspaceAgentTurn } from "@/lib/context-run/apply-globe-workspace-agent-turn";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { publishGlobeProjectionLayerPolicy } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import { clearCalloutWindowsForTests } from "@/lib/callout/windows";
import { listActiveCalloutWindows } from "@/lib/callout/windows";

const CTX = "ctx_osaka_spatial_tool";

function lodgingNode(id: string, title: string): ContextWorkspaceNode {
  return {
    id,
    kind: "lodging",
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.6654,
    lng: 135.501,
    rating: 4.5,
    priceBand: 2,
    amountLabel: "₩120,000",
    thumbnailUrl: null,
    tags: ["stay:hotel"],
    visible: true,
    selected: true,
    bookmarked: true,
    source: "seed",
  };
}

clearCalloutWindowsForTests();
clearContextWorkspace(CTX);

openMapContextWorkspace({
  contextEventId: CTX,
  domain: "lodging",
  query: "오사카 숙소",
  summaryKo: "Osaka Trip",
  candidates: [],
});

const opened = readContextWorkspace(CTX)!;
writeContextWorkspace({
  ...opened,
  summaryKo: "Osaka Trip",
  nodes: [lodgingNode("hotel_123", "Namba Hotel")],
  selectedIds: ["hotel_123"],
  updatedAtIso: new Date().toISOString(),
});
writeContextWorkspaceExpanded(CTX, true);
publishGlobeProjectionLayerPolicy({
  mode: "focus",
  activeContextEventId: CTX,
  visiblePlaceIds: [],
});

const utterance = "난바 호텔 기준 맛집 찾아줘";
const plan = planContextRun(
  bindSituation({
    kind: "text",
    text: utterance,
    surface: "composer",
    layerMode: "personal",
    contextEventId: CTX,
  }),
);
assert.equal(plan.kind, "workspace_agent");

void (async () => {
  const agent = await applyGlobeWorkspaceAgentTurn({
    utterance,
    explicitContextEventId: CTX,
  });
  assert.equal(agent.handled, true);
  assert.equal(agent.via, "spatial_discovery");
  assert.equal(agent.committed, false);
  assert.ok(agent.statusKo);
  assert.ok(!agent.statusKo!.includes("\n"));
  assert.ok(agent.workspaceMutated);

  const after = readContextWorkspace(CTX)!;
  const eateries = after.nodes.filter((n) => n.kind === "eatery" && n.visible);
  assert.ok(eateries.length >= 1, "restaurant pins added to Workspace");
  assert.ok(
    after.relationshipEdges.some((e) => e.kind === "nearby"),
    "nearby relationships created",
  );
  // Facet model: Agent does not spawn multi floating Callout windows
  assert.equal(
    listActiveCalloutWindows().length,
    0,
    "no multi floating Callout windows",
  );

  clearCalloutWindowsForTests();
  clearContextWorkspace(CTX);
  console.log("ok — SPATIAL_DISCOVERY Tool → Workspace Patch (facet, no windows)");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
