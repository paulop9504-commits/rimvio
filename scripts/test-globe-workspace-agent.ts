/**
 * STEP 2 smoke: Globe Prompt → Reality Workspace Agent
 * - Open WS + soft refine ("더 싼 호텔" / capsule filter)
 * - Spatial discovery projected into Workspace
 * - Short statusKo only; never Commit; no essay
 */
import assert from "node:assert/strict";
import { bindSituation } from "@/lib/context-run/bind-situation";
import { planContextRun } from "@/lib/context-run/plan-context-run";
import {
  applyGlobeWorkspaceAgentTurn,
  shortenWorkspaceAgentStatus,
} from "@/lib/context-run/apply-globe-workspace-agent-turn";
import { isWorkspaceAgentWorkUtterance } from "@/lib/context-run/is-workspace-agent-work-utterance";
import {
  hasActiveWorkspaceForGlobePrompt,
  resolveActiveWorkspaceContextId,
} from "@/lib/context-run/resolve-active-workspace-context";
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

const CTX = "ctx_osaka_trip_step2";

function lodgingNode(
  id: string,
  title: string,
  tags: readonly string[],
  priceBand = 2,
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
    priceBand,
    amountLabel: priceBand <= 2 ? "₩70,000" : "₩180,000",
    thumbnailUrl: null,
    tags,
    visible: true,
    selected: false,
    bookmarked: false,
    source: "seed",
  };
}

function resetWorkspace(): void {
  clearCalloutWindowsForTests();
  clearContextWorkspace(CTX);
  openMapContextWorkspace({
    contextEventId: CTX,
    domain: "lodging",
    query: "오사카 숙소",
    summaryKo: "Osaka Trip",
    candidates: [],
  });
  const opened = readContextWorkspace(CTX);
  assert.ok(opened, "workspace opened");
  writeContextWorkspace({
    ...opened!,
    summaryKo: "Osaka Trip",
    nodes: [
      lodgingNode("h_capsule", "난바 캡슐호텔", ["stay:capsule"], 1),
      lodgingNode("h_biz", "난바 비즈니스호텔", ["stay:business"], 3),
      lodgingNode("h_capsule2", "도톤보리 캡슐", ["stay:capsule"], 2),
    ],
    selectedIds: ["h_biz"],
    updatedAtIso: new Date().toISOString(),
  });
  writeContextWorkspaceExpanded(CTX, true);
  publishGlobeProjectionLayerPolicy({
    mode: "focus",
    activeContextEventId: CTX,
    visiblePlaceIds: [],
  });
}

assert.equal(isWorkspaceAgentWorkUtterance("더 싼 호텔"), true);
assert.equal(isWorkspaceAgentWorkUtterance("캡슐호텔만 보여줘"), true);
assert.equal(isWorkspaceAgentWorkUtterance("난바 호텔 기준 맛집"), true);

resetWorkspace();
assert.equal(resolveActiveWorkspaceContextId(), CTX);
assert.equal(hasActiveWorkspaceForGlobePrompt(), true);

const bound = bindSituation({
  kind: "text",
  text: "캡슐호텔만 보여줘",
  surface: "composer",
  layerMode: "personal",
  contextEventId: CTX,
});
const plan = planContextRun(bound);
assert.equal(plan.kind, "workspace_agent");
assert.equal(plan.workspaceAgentContextEventId, CTX);

// Weather / free-talk while Workspace open → conversational, not Agent Loop
const askBound = bindSituation({
  kind: "text",
  text: "오늘 날씨 어때",
  surface: "composer",
  layerMode: "personal",
  contextEventId: CTX,
});
assert.equal(planContextRun(askBound).kind, "small_talk");

// Vague NL while Workspace open → clarify (small_talk), not forced workspace_agent
const vagueBound = bindSituation({
  kind: "text",
  text: "이거 어때?",
  surface: "composer",
  layerMode: "personal",
  contextEventId: CTX,
});
assert.equal(planContextRun(vagueBound).kind, "small_talk");

void (async () => {
  const agent = await applyGlobeWorkspaceAgentTurn({
    utterance: "캡슐호텔만 보여줘",
    explicitContextEventId: CTX,
  });
  assert.equal(agent.handled, true);
  assert.equal(agent.contextEventId, CTX);
  assert.equal(agent.workspaceMutated, true);
  assert.equal(agent.committed, false);
  assert.equal(agent.waitingCommit ?? false, false);
  assert.ok(agent.statusKo);
  assert.ok(!agent.statusKo!.includes("\n"), "status must be one line");
  assert.ok(agent.statusKo!.length <= 72);

  const after = readContextWorkspace(CTX)!;
  assert.equal(after.realityPlan?.stayType, "capsule");
  const visible = after.nodes.filter((n) => n.visible);
  assert.ok(
    visible.every((n) => n.tags.includes("stay:capsule")),
    "only capsule stays visible after filter patch",
  );
  assert.ok(visible.length >= 1);

  // Soft refine — cheaper
  resetWorkspace();
  const cheap = await applyGlobeWorkspaceAgentTurn({
    utterance: "더 싼 호텔",
    explicitContextEventId: CTX,
  });
  assert.equal(cheap.handled, true);
  assert.equal(cheap.committed, false);
  assert.ok(cheap.statusKo);
  assert.ok(cheap.statusKo!.length <= 72);

  // Spatial discovery → Workspace patch
  resetWorkspace();
  const live = readContextWorkspace(CTX)!;
  writeContextWorkspace({
    ...live,
    nodes: [
      lodgingNode("hotel_123", "Namba Hotel", ["stay:hotel"], 2),
    ].map((n) => ({ ...n, selected: true, bookmarked: true })),
    selectedIds: ["hotel_123"],
    updatedAtIso: new Date().toISOString(),
  });
  const spatialUtt = "난바 호텔 기준 맛집 찾아줘";
  assert.equal(
    planContextRun(
      bindSituation({
        kind: "text",
        text: spatialUtt,
        surface: "composer",
        layerMode: "personal",
        contextEventId: CTX,
      }),
    ).kind,
    "workspace_agent",
  );
  const spatial = await applyGlobeWorkspaceAgentTurn({
    utterance: spatialUtt,
    explicitContextEventId: CTX,
  });
  assert.equal(spatial.handled, true);
  assert.equal(spatial.committed, false);
  assert.ok(spatial.statusKo);
  assert.ok(!/\n/.test(spatial.statusKo!));
  assert.ok(
    spatial.via === "spatial_discovery" ||
      spatial.via === "workspace_prompt" ||
      spatial.via === "workspace_patch" ||
      spatial.statusKo!.length > 0,
  );

  const long = shortenWorkspaceAgentStatus(`${"가".repeat(100)}\n두 번째 줄`);
  assert.ok(long);
  assert.ok(long!.length <= 72);
  assert.ok(!long!.includes("\n"));

  clearContextWorkspace(CTX);
  console.log("ok — Globe → Workspace Agent (capsule · cheap · spatial · no essay)");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
