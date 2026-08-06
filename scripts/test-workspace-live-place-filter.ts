/**
 * Live place vs orbit shell filter.
 * Run: npx tsx scripts/test-workspace-live-place-filter.ts
 */
import assert from "node:assert/strict";
import {
  filterNodesForWorkspaceMapFocus,
  isGenericOrbitPlaceTitle,
  isLiveWorkspacePlaceNode,
  isWorkspaceReadySlotNode,
} from "@/lib/context-workspace/workspace-map-focus";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

function node(
  partial: Partial<ContextWorkspaceNode> &
    Pick<ContextWorkspaceNode, "id" | "title" | "kind">,
): ContextWorkspaceNode {
  return {
    placeId: partial.placeId ?? partial.id,
    summaryKo: partial.summaryKo ?? "",
    lat: partial.lat ?? 34.66,
    lng: partial.lng ?? 135.5,
    rating: partial.rating ?? 4.5,
    priceBand: null,
    amountLabel: null,
    reviewCount: null,
    thumbnailUrl: null,
    galleryUrls: null,
    liteapiOfferId: null,
    tags: partial.tags ?? [],
    visible: partial.visible ?? true,
    selected: false,
    bookmarked: partial.bookmarked ?? false,
    source: partial.source ?? "maps",
    actionReadyState: partial.actionReadyState ?? "ready",
    ...partial,
  } as ContextWorkspaceNode;
}

assert.equal(isGenericOrbitPlaceTitle("근처 카페"), true);
assert.equal(isGenericOrbitPlaceTitle("포토스팟"), true);
assert.equal(isGenericOrbitPlaceTitle("리버뷰 호텔"), true);
assert.equal(isGenericOrbitPlaceTitle("Shinsaibashi Grand Hotel Osaka"), false);

const shell = node({
  id: "ws-node:burst:slot1",
  placeId: "burst:slot1",
  title: "근처 카페",
  kind: "eatery",
  source: "trip_prep_draft",
  tags: ["placeholder_label", "entity_unresolved"],
});
assert.equal(isWorkspaceReadySlotNode(shell), true);
assert.equal(isLiveWorkspacePlaceNode(shell), false);

const liveHotel = node({
  id: "ws:lodging:liteapi:1",
  placeId: "liteapi:1",
  title: "Shinsaibashi Grand Hotel Osaka",
  kind: "lodging",
  source: "liteapi",
  tags: ["reservable"],
});
assert.equal(isLiveWorkspacePlaceNode(liveHotel), true);

const apa = node({
  id: "ws-node:lodging:osaka:apa",
  placeId: "lodging:osaka:apa",
  title: "APA 난바",
  kind: "lodging",
  source: "trip_prep_draft",
  tags: ["entity_resolved", "fallback_seed"],
});
assert.equal(isLiveWorkspacePlaceNode(apa), true);

const focused = filterNodesForWorkspaceMapFocus({
  nodes: [shell, liveHotel, apa],
  focusKind: null,
});
assert.ok(focused.every((n) => n.id !== shell.id));
assert.ok(focused.some((n) => n.id === liveHotel.id));
assert.ok(focused.some((n) => n.id === apa.id));

console.log("workspace-live-place-filter: ok");
