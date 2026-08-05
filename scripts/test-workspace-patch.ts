/**
 * Smoke: Workspace stores Patches only — never Answers.
 * "더 싼 호텔" → replace_entity
 * "Day2로 옮겨" → move_schedule
 * "난바역 근처" → spatial_constraint
 */
import assert from "node:assert/strict";
import {
  WORKSPACE_PATCH_KINDS,
  applyWorkspacePatch,
  parseWorkspacePatch,
} from "@/lib/context-workspace/workspace-patch";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { applyGlobeWorkspaceAgentTurn } from "@/lib/context-run/apply-globe-workspace-agent-turn";
import { publishGlobeProjectionLayerPolicy } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import { writeContextWorkspaceExpanded } from "@/lib/context-workspace/workspace-store";

assert.ok(WORKSPACE_PATCH_KINDS.includes("replace_entity"));
assert.ok(WORKSPACE_PATCH_KINDS.includes("move_schedule"));
assert.ok(WORKSPACE_PATCH_KINDS.includes("spatial_constraint"));

assert.equal(parseWorkspacePatch("더 싼 호텔")?.kind, "replace_entity");
assert.equal(parseWorkspacePatch("Day2로 옮겨")?.kind, "move_schedule");
assert.equal(parseWorkspacePatch("난바역 근처")?.kind, "spatial_constraint");
{
  const compound = parseWorkspacePatch("이 중 2번을 Day 2에 넣어줘");
  assert.equal(compound?.kind, "move_schedule");
  if (compound?.kind === "move_schedule") {
    assert.equal(compound.dayIndex, 1);
    assert.equal(compound.ordinalIndex, 1);
  }
}
{
  const kyobashi = parseWorkspacePatch("교바시역 근처 캡슐호텔 찾아줘");
  assert.equal(kyobashi?.kind, "spatial_constraint");
  if (kyobashi?.kind === "spatial_constraint") {
    assert.equal(kyobashi.nearLabelKo, "교바시역");
    assert.equal(kyobashi.stayType, "capsule");
  }
}

const CTX = "ctx_patch_only";
clearContextWorkspace(CTX);
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "lodging",
  query: "오사카 숙소",
  summaryKo: "Osaka Trip",
  candidates: [],
});

const node: ContextWorkspaceNode = {
  id: "h1",
  kind: "lodging",
  placeId: "h1",
  title: "Namba Hotel",
  summaryKo: "난바",
  lat: 34.665,
  lng: 135.501,
  rating: 4.2,
  priceBand: 3,
  amountLabel: "₩150,000",
  thumbnailUrl: null,
  tags: ["stay:hotel"],
  visible: true,
  selected: true,
  bookmarked: false,
  source: "seed",
};

const opened = readContextWorkspace(CTX)!;
writeContextWorkspace({
  ...opened,
  nodes: [node],
  selectedIds: ["h1"],
  patches: [],
});
writeContextWorkspaceExpanded(CTX, true);
publishGlobeProjectionLayerPolicy({
  mode: "focus",
  activeContextEventId: CTX,
  visiblePlaceIds: [],
});

const cheaper = applyWorkspacePatch({
  contextEventId: CTX,
  patch: parseWorkspacePatch("더 싼 호텔")!,
  utterance: "더 싼 호텔",
});
assert.equal(cheaper.ok, true);
assert.equal(cheaper.record?.kind, "replace_entity");
assert.equal(cheaper.record?.answerForbidden, true);

writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes: [node],
  selectedIds: ["h1"],
  domain: "lodging",
});

const day2 = applyWorkspacePatch({
  contextEventId: CTX,
  patch: parseWorkspacePatch("Day2로 옮겨")!,
  utterance: "Day2로 옮겨",
});
assert.equal(day2.ok, true);
assert.equal(day2.record?.kind, "move_schedule");
{
  const afterDay = readContextWorkspace(CTX)!;
  const stamped = afterDay.nodes.find((n) =>
    n.tags.some((t) => /^day[_-]?2$/iu.test(t)),
  );
  assert.ok(stamped, "move_schedule stamps day_2");
  assert.equal(stamped!.id, "h1");
  assert.ok(
    afterDay.realityDraft?.days.some(
      (d) => d.day === 2 && d.nodes.some((n) => n.nodeId === "h1"),
    ),
  );
}

const near = applyWorkspacePatch({
  contextEventId: CTX,
  patch: parseWorkspacePatch("난바역 근처")!,
  utterance: "난바역 근처",
});
assert.equal(near.ok, true);
assert.equal(near.record?.kind, "spatial_constraint");

const state = readContextWorkspace(CTX)!;
assert.ok((state.patches?.length ?? 0) >= 3, "patches logged");
assert.ok(
  state.patches?.every((p) => p.answerForbidden === true),
  "no answer storage",
);

void (async () => {
  const agent = await applyGlobeWorkspaceAgentTurn({
    utterance: "더 싼 호텔",
    explicitContextEventId: CTX,
  });
  assert.equal(agent.via, "workspace_patch");
  assert.equal(agent.patchKind, "replace_entity");
  assert.ok(agent.statusKo);
  assert.ok(!agent.statusKo!.includes("\n"));

  clearContextWorkspace(CTX);
  console.log("ok — Workspace Patch-only SSOT (replace / move_schedule / spatial)");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
