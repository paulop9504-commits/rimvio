/**
 * Smoke: Workspace stores Patches only — never Answers.
 * Soft refine (P0): "더 싼 호텔" → filter_entity (in-set), not replace rescout
 * Explicit: "더 싼 호텔 다시 찾아줘" → replace_entity
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
assert.ok(WORKSPACE_PATCH_KINDS.includes("filter_entity"));

assert.equal(parseWorkspacePatch("더 싼 호텔")?.kind, "filter_entity");
assert.equal(
  parseWorkspacePatch("이중에 가성비 좋은 것만 3개")?.kind,
  "filter_entity",
);
{
  const top3 = parseWorkspacePatch("이중에 가성비 좋은 것만 3개");
  assert.equal(top3?.kind, "filter_entity");
  if (top3?.kind === "filter_entity") {
    assert.equal(top3.filter.keepTopN, 3);
    assert.equal(top3.filter.sortBy, "value");
  }
}
assert.equal(
  parseWorkspacePatch("더 싼 호텔 다시 찾아줘")?.kind,
  "replace_entity",
);
assert.equal(parseWorkspacePatch("Day2로 옮겨")?.kind, "move_schedule");
assert.equal(parseWorkspacePatch("난바역 근처")?.kind, "spatial_constraint");
{
  const korean = parseWorkspacePatch("한식만 보여줘");
  assert.equal(korean?.kind, "filter_entity");
  if (korean?.kind === "filter_entity") {
    assert.equal(korean.filter.queryIncludes, "한식");
    assert.ok(korean.filter.tagIncludes?.includes("cuisine:korean"));
  }
}
{
  const budget = parseWorkspacePatch("2만원 이하만 보여줘");
  assert.equal(budget?.kind, "filter_entity");
  if (budget?.kind === "filter_entity") {
    assert.equal(budget.filter.maxNightlyPriceKrw, 20_000);
  }
}
{
  const rating = parseWorkspacePatch("4.5점 이상만 남겨줘");
  assert.equal(rating?.kind, "filter_entity");
  if (rating?.kind === "filter_entity") {
    assert.equal(rating.filter.minRating, 4.5);
  }
}
{
  const compound = parseWorkspacePatch(
    "한식이고 2만원 이하인데 데이트하기 좋은 곳만 보여줘",
  );
  assert.equal(compound?.kind, "filter_entity");
  if (compound?.kind === "filter_entity") {
    assert.equal(compound.filter.queryIncludes, "한식");
    assert.equal(compound.filter.maxNightlyPriceKrw, 20_000);
  }
}
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

function hotel(
  id: string,
  title: string,
  priceBand: number,
  rating: number,
): ContextWorkspaceNode {
  return {
    id,
    kind: "lodging",
    placeId: id,
    title,
    summaryKo: title,
    lat: 34.665,
    lng: 135.501,
    rating,
    priceBand,
    amountLabel: `₩${priceBand * 50_000}`,
    thumbnailUrl: null,
    tags: ["stay:hotel"],
    visible: true,
    selected: id === "h1",
    bookmarked: false,
    source: "search",
  };
}

const nodes: ContextWorkspaceNode[] = [
  hotel("h1", "Premium Hotel", 4, 4.5),
  hotel("h2", "Value Hotel", 2, 4.2),
  hotel("h3", "Mid Hotel", 3, 4.0),
  hotel("h4", "Budget Inn", 1, 3.9),
];

const opened = readContextWorkspace(CTX)!;
writeContextWorkspace({
  ...opened,
  nodes,
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
assert.equal(cheaper.record?.kind, "filter_entity");
assert.equal(cheaper.record?.answerForbidden, true);
assert.equal(cheaper.needsRescout, false);
{
  const after = readContextWorkspace(CTX)!;
  const visible = after.nodes.filter((n) => n.visible);
  assert.ok(visible.length >= 1, "soft refine keeps some candidates");
  assert.ok(visible.length < nodes.length, "soft refine hides some pricier");
  assert.ok(
    visible.every((n) => n.id === "h1" || (n.priceBand ?? 99) <= 2),
    "visible are selected or ≤ median band",
  );
  assert.equal(after.nodes.length, nodes.length, "in-set — no wipe inventory");
}

writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes,
  selectedIds: ["h1"],
  domain: "lodging",
});

const top3 = applyWorkspacePatch({
  contextEventId: CTX,
  patch: parseWorkspacePatch("이중에 가성비 좋은 것만 3개")!,
  utterance: "이중에 가성비 좋은 것만 3개",
});
assert.equal(top3.ok, true);
assert.equal(top3.record?.kind, "filter_entity");
assert.equal(top3.needsRescout, false);
{
  const after = readContextWorkspace(CTX)!;
  const visible = after.nodes.filter(
    (n) => n.visible && n.source !== "reality_anchor",
  );
  assert.ok(visible.length <= 3 + 1, "top-N soft keep (+ selected)");
  assert.equal(after.nodes.length, nodes.length);
}

writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  nodes,
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
  writeContextWorkspace({
    ...readContextWorkspace(CTX)!,
    nodes,
    selectedIds: ["h1"],
    domain: "lodging",
  });
  const agent = await applyGlobeWorkspaceAgentTurn({
    utterance: "더 싼 호텔",
    explicitContextEventId: CTX,
  });
  assert.equal(agent.via, "workspace_patch");
  assert.equal(agent.patchKind, "filter_entity");
  assert.ok(agent.statusKo);
  assert.ok(!agent.statusKo!.includes("\n"));
  {
    const after = readContextWorkspace(CTX)!;
    assert.equal(after.nodes.length, nodes.length, "agent soft refine keeps set");
  }

  clearContextWorkspace(CTX);
  console.log(
    "ok — Workspace Patch soft-refine (filter in-set) / move_schedule / spatial",
  );
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
