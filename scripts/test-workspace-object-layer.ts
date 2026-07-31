/**
 * Workspace object layer resolver — pin → 호텔/맛집/놀거리/항공/티켓/기타.
 */
import assert from "node:assert/strict";
import type { ContextWorkspaceNode } from "../lib/context-workspace/types";
import {
  filterNodesByObjectLayer,
  listPresentObjectLayers,
  resolveWorkspaceObjectLayer,
} from "../lib/context-workspace/workspace-object-layer";

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

const hotel = node({ id: "h1", kind: "lodging", title: "Hotel Interciti" });
const food = node({ id: "f1", kind: "eatery", title: "도톤보리 스시" });
const play = node({
  id: "p1",
  kind: "poi",
  title: "유니버설 스튜디오",
  tags: ["experience", "theme_park"],
});
const flight = node({
  id: "a1",
  kind: "poi",
  title: "간사이 공항",
  tags: ["airport", "flight", "arrival"],
});
const ticket = node({
  id: "t1",
  kind: "poi",
  title: "USJ 입장권",
  tags: ["ticket", "usj"],
});
const other = node({ id: "o1", kind: "amenity", title: "편의점" });

assert.equal(resolveWorkspaceObjectLayer(hotel), "hotel");
assert.equal(resolveWorkspaceObjectLayer(food), "food");
assert.equal(resolveWorkspaceObjectLayer(play), "play");
assert.equal(resolveWorkspaceObjectLayer(flight), "flight");
assert.equal(resolveWorkspaceObjectLayer(ticket), "ticket");
assert.equal(resolveWorkspaceObjectLayer(other), "other");

const all = [hotel, food, play, flight, ticket, other];
assert.deepEqual(listPresentObjectLayers(all), [
  "hotel",
  "food",
  "play",
  "flight",
  "ticket",
  "other",
]);
assert.equal(filterNodesByObjectLayer(all, "hotel").length, 1);
assert.equal(filterNodesByObjectLayer(all, "food")[0]?.id, "f1");

console.log("test-workspace-object-layer: ok");
