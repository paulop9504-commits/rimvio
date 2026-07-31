/**
 * Workspace map One Focus — slot expand filters + ready-slot detection.
 */
import assert from "node:assert/strict";
import type { ContextWorkspaceNode } from "../lib/context-workspace/types";
import {
  filterNodesForWorkspaceMapFocus,
  isWorkspacePlaceCandidateNode,
  isWorkspaceReadySlotNode,
  resolveExpandableSlotKind,
} from "../lib/context-workspace/workspace-map-focus";

function node(
  partial: Partial<ContextWorkspaceNode> &
    Pick<ContextWorkspaceNode, "id" | "kind" | "title">,
): ContextWorkspaceNode {
  return {
    placeId: partial.placeId ?? partial.id,
    summaryKo: partial.summaryKo ?? "",
    lat: partial.lat ?? 34.7,
    lng: partial.lng ?? 135.5,
    rating: partial.rating ?? 4.2,
    priceBand: partial.priceBand ?? 2,
    amountLabel: partial.amountLabel ?? null,
    thumbnailUrl: partial.thumbnailUrl ?? null,
    tags: partial.tags ?? [],
    visible: partial.visible ?? true,
    selected: partial.selected ?? false,
    bookmarked: partial.bookmarked ?? false,
    source: partial.source ?? "test",
    ...partial,
  };
}

const slotLodging = node({
  id: "slot-lodge",
  kind: "lodging",
  title: "여행지 숙소",
  source: "trip_prep_draft",
  tags: ["skeleton", "ready_slot", "lodging", "stay"],
});
const slotFood = node({
  id: "slot-food",
  kind: "eatery",
  title: "여행지 맛집",
  source: "trip_prep_draft",
  tags: ["skeleton", "ready_slot", "food"],
});
const day2 = node({
  id: "slot-d2",
  kind: "poi",
  title: "여행지 2일차",
  source: "trip_prep_draft",
  tags: ["skeleton", "ready_slot", "day_2"],
});
const hotelA = node({
  id: "hotel-a",
  kind: "lodging",
  title: "난바 호텔 A",
  source: "liteapi",
  tags: ["stay"],
});
const hotelB = node({
  id: "hotel-b",
  kind: "lodging",
  title: "신사이바시 B",
  source: "maps",
});

assert.equal(isWorkspaceReadySlotNode(slotLodging), true);
assert.equal(isWorkspaceReadySlotNode(hotelA), false);
assert.equal(isWorkspacePlaceCandidateNode(hotelA), true);
assert.equal(resolveExpandableSlotKind(slotLodging), "lodging");
assert.equal(resolveExpandableSlotKind(slotFood), "eatery");
assert.equal(resolveExpandableSlotKind(day2), null);
assert.equal(resolveExpandableSlotKind(hotelA), null);

const all = [slotLodging, slotFood, day2, hotelA, hotelB];

const overview = filterNodesForWorkspaceMapFocus({
  nodes: all,
  focusKind: null,
});
assert.deepEqual(
  overview.map((n) => n.id).sort(),
  ["slot-d2", "slot-food", "slot-lodge"],
);

const lodgingFocus = filterNodesForWorkspaceMapFocus({
  nodes: all,
  focusKind: "lodging",
});
assert.deepEqual(
  lodgingFocus.map((n) => n.id).sort(),
  ["hotel-a", "hotel-b"],
);

const emptyLodgingFocus = filterNodesForWorkspaceMapFocus({
  nodes: [slotLodging, day2],
  focusKind: "lodging",
});
assert.equal(emptyLodgingFocus.length, 1);
assert.equal(emptyLodgingFocus[0]?.id, "slot-lodge");

console.log("test-workspace-map-focus: ok");
