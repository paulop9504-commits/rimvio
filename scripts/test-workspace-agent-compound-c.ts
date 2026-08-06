/**
 * Compound C (soft in-set) execution smoke.
 * Run: npx tsx scripts/test-workspace-agent-compound-c.ts
 */
import assert from "node:assert/strict";
import { compileWorkspaceAgentPlan } from "@/lib/context-run/compile-workspace-agent-plan";
import { runWorkspaceAgentPlan } from "@/lib/context-run/run-workspace-agent-plan";
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

const CTX = "ctx_compound_c_exec";
const UTT =
  "난바역 근처 호텔 중 15만원 이하로 하나 골라서 Day 1 숙소로 넣고, 근처 저녁 맛집도 같이 추가해줘";

function lodging(
  id: string,
  title: string,
  amountLabel: string,
  priceBand: number,
): ContextWorkspaceNode {
  return {
    id,
    kind: "lodging",
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.665,
    lng: 135.5,
    rating: 4.2,
    priceBand,
    amountLabel,
    thumbnailUrl: null,
    tags: ["stay:hotel"],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "seed",
  };
}

function eatery(id: string, title: string): ContextWorkspaceNode {
  return {
    id,
    kind: "eatery",
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.666,
    lng: 135.501,
    rating: 4.5,
    priceBand: 2,
    amountLabel: "₩12,000",
    thumbnailUrl: null,
    tags: ["dinner"],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "seed",
  };
}

{
  const plan = compileWorkspaceAgentPlan({ utterance: UTT, contextEventId: CTX });
  assert.equal(plan.planKind, "compound_c");
  assert.equal(plan.steps.length, 4);
  assert.ok(plan.steps.every((s) => s.kind === "workspace_patch"));
  assert.ok(plan.steps.some((s) => /남겨|이하/u.test(s.utterance)));
  assert.ok(plan.steps.some((s) => /동선/u.test(s.utterance)));
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
writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes: [
    lodging("h_hi", "Premium Hotel", "₩180,000", 4),
    lodging("h_ok", "Value Hotel", "₩90,000", 2),
    lodging("h_mid", "Mid Hotel", "₩120,000", 3),
    eatery("e1", "난바 저녁 맛집"),
  ],
  selectedIds: [],
  updatedAtIso: new Date().toISOString(),
});
writeContextWorkspaceExpanded(CTX, true);
publishGlobeProjectionLayerPolicy({
  mode: "focus",
  activeContextEventId: CTX,
  visiblePlaceIds: [],
});

void (async () => {
  const ran = await runWorkspaceAgentPlan({
    utterance: UTT,
    explicitContextEventId: CTX,
  });
  assert.equal(ran.plan.planKind, "compound_c");
  assert.equal(ran.stepsFailed, 0);
  assert.equal(ran.stepsDone, 4);

  const after = readContextWorkspace(CTX)!;
  assert.ok(
    after.nodes.find((n) => n.id === "h_ok")!.tags.some((t) => /^day[_-]?1$/i.test(t)),
    "budget lodging on day 1",
  );
  assert.ok(
    after.nodes.find((n) => n.id === "e1")!.tags.some((t) => /^day[_-]?1$/i.test(t)),
    "eatery on day 1",
  );
  assert.equal(
    after.nodes.find((n) => n.id === "h_hi")!.visible,
    false,
    "over-budget hotel hidden by soft leave",
  );

  writeContextWorkspace({
    ...readContextWorkspace(CTX)!,
    nodes: [
      lodging("h_hi", "Premium Hotel", "₩180,000", 4),
      lodging("h_ok", "Value Hotel", "₩90,000", 2),
      lodging("h_mid", "Mid Hotel", "₩120,000", 3),
      eatery("e1", "난바 저녁 맛집"),
    ],
    selectedIds: [],
    updatedAtIso: new Date().toISOString(),
  });

  const turn = await applyGlobeWorkspaceAgentTurn({
    utterance: UTT,
    explicitContextEventId: CTX,
  });
  assert.equal(turn.handled, true);
  assert.equal(turn.committed, false);
  assert.ok(turn.workspaceMutated);
  assert.ok(turn.statusKo);

  clearContextWorkspace(CTX);
  console.log("ok — Compound C soft filter · Day1 lodging · eatery · rebuild_route");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
