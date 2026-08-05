#!/usr/bin/env npx tsx
/**
 * Workspace Capability Objects — Intent opens panels, not fixed tabs.
 */

import assert from "node:assert/strict";
import {
  applyWorkspaceCapabilityOp,
  buildLayoutFromRecipe,
  getWorkspaceCapabilityRecipe,
  isCapabilityOpen,
  listOpenCapabilities,
  openCapabilityLayoutForWorkspace,
  readWorkspaceCapabilityLayout,
  resetWorkspaceCapabilityLayoutsForTests,
  resolveWorkspaceCapabilityIntent,
  tryApplyCapabilityUtterance,
} from "../lib/workspace-capability";
import type { ContextWorkspaceState } from "../lib/context-workspace/types";
import { CONTEXT_WORKSPACE_VERSION } from "../lib/context-workspace/types";

resetWorkspaceCapabilityLayoutsForTests();

assert.equal(resolveWorkspaceCapabilityIntent("오사카 맛집 찾아줘"), "eatery_search");
assert.equal(
  resolveWorkspaceCapabilityIntent("오사카 4박5일 일정 만들어줘"),
  "trip_plan",
);
assert.equal(resolveWorkspaceCapabilityIntent("호텔 예약해"), "lodging_book");
assert.equal(resolveWorkspaceCapabilityIntent("친구랑 일정 공유"), "share_collab");

{
  const recipe = getWorkspaceCapabilityRecipe("eatery_search");
  const ids = new Set(recipe.open.map((o) => o.id));
  assert.ok(ids.has("search_summary"));
  assert.ok(ids.has("compare"));
  assert.ok(!ids.has("budget"));
  assert.ok(!ids.has("day_rail"));
  assert.ok(!ids.has("journal"));
}

{
  const recipe = getWorkspaceCapabilityRecipe("trip_plan");
  const ids = new Set(recipe.open.map((o) => o.id));
  assert.ok(ids.has("day_rail"));
  assert.ok(ids.has("timeline"));
  assert.ok(ids.has("budget"));
  assert.ok(ids.has("booking"));
  assert.ok(!ids.has("payment"));
  assert.ok(!ids.has("journal"));
}

{
  const layout = buildLayoutFromRecipe({
    contextEventId: "ctx-cap-1",
    intentId: "trip_plan",
  });
  assert.equal(isCapabilityOpen(layout, "budget"), true);
  assert.equal(isCapabilityOpen(layout, "journal"), false);

  applyWorkspaceCapabilityOp({
    contextEventId: "ctx-cap-1",
    op: { type: "apply_recipe", intentId: "trip_plan" },
  });
  assert.ok(readWorkspaceCapabilityLayout("ctx-cap-1"));

  assert.equal(
    tryApplyCapabilityUtterance({
      contextEventId: "ctx-cap-1",
      utterance: "예산은 필요 없어",
    }),
    true,
  );
  const after = readWorkspaceCapabilityLayout("ctx-cap-1");
  assert.equal(isCapabilityOpen(after, "budget"), false);

  assert.equal(
    tryApplyCapabilityUtterance({
      contextEventId: "ctx-cap-1",
      utterance: "날씨 크게 보여",
    }),
    true,
  );
  const weather = readWorkspaceCapabilityLayout("ctx-cap-1");
  assert.equal(isCapabilityOpen(weather, "weather"), true);
  assert.equal(
    weather?.items.find((i) => i.id === "weather")?.size,
    "lg",
  );

  assert.equal(
    tryApplyCapabilityUtterance({
      contextEventId: "ctx-cap-1",
      utterance: "예약은 오른쪽으로",
    }),
    true,
  );
  const moved = readWorkspaceCapabilityLayout("ctx-cap-1");
  assert.equal(
    moved?.items.find((i) => i.id === "booking")?.slot,
    "right",
  );
}

{
  const state: ContextWorkspaceState = {
    version: CONTEXT_WORKSPACE_VERSION,
    workspaceId: "ws-1",
    contextEventId: "ctx-open-seed",
    domain: "eatery",
    status: "editing",
    query: "오사카 맛집",
    summaryKo: "맛집",
    nodes: [],
    relationshipEdges: [],
    compilerIr: null,
    filter: {},
    selectedIds: [],
    compareIds: [],
    surfacePrimary: "rich_card",
    openedAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
    committedAtIso: null,
    lastChangeKo: null,
    lastWhy: null,
    history: [],
    future: [],
  };
  const layout = openCapabilityLayoutForWorkspace({
    state,
    utterance: "오사카 맛집 찾아줘",
    replace: true,
  });
  assert.equal(layout?.intentId, "eatery_search");
  const openIds = listOpenCapabilities(layout).map((i) => i.id);
  assert.ok(openIds.includes("candidate_list"));
  assert.ok(!openIds.includes("day_rail"));
}

console.log("test-workspace-capability: ok");
