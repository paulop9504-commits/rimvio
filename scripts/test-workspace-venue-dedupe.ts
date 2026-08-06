/**
 * Smoke: workspace venue dedupe — no synthetic “비슷한 N” clones, no near-dup hotels.
 */
import assert from "node:assert/strict";
import {
  dedupeWorkspaceVenueNodes,
  isSyntheticSimilarClone,
} from "@/lib/context-workspace/dedupe-workspace-venue-nodes";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

function node(
  partial: Partial<ContextWorkspaceNode> &
    Pick<ContextWorkspaceNode, "id" | "placeId" | "title" | "lat" | "lng">,
): ContextWorkspaceNode {
  return {
    kind: "lodging",
    summaryKo: null,
    rating: 4.2,
    priceBand: 2,
    amountLabel: null,
    reviewCount: null,
    thumbnailUrl: null,
    galleryUrls: null,
    liteapiOfferId: null,
    tags: [],
    visible: true,
    selected: false,
    bookmarked: false,
    source: "seed",
    ...partial,
  };
}

assert.equal(
  isSyntheticSimilarClone({
    placeId: "hilton-sim-123-0",
    title: "Hilton · 비슷한 1",
  }),
  true,
);

const input = [
  node({
    id: "ws:lodging:a",
    placeId: "hilton",
    title: "Hilton Osaka",
    lat: 34.69,
    lng: 135.52,
    rating: 4.3,
  }),
  node({
    id: "ws:lodging:a-sim",
    placeId: "hilton-sim-999-0",
    title: "Hilton Osaka · 비슷한 1",
    lat: 34.694,
    lng: 135.523,
    tags: ["similar"],
  }),
  node({
    id: "ws:lodging:a2",
    placeId: "hilton-b",
    title: "Hilton Osaka",
    lat: 34.6901,
    lng: 135.5201,
    rating: 4.1,
  }),
  node({
    id: "ws:lodging:b",
    placeId: "doubletree",
    title: "DoubleTree by Hilton Osaka Castle",
    lat: 34.68,
    lng: 135.53,
  }),
];

const out = dedupeWorkspaceVenueNodes(input);
assert.equal(out.length, 2);
assert.ok(out.every((n) => !isSyntheticSimilarClone(n)));
assert.ok(out.some((n) => n.placeId === "hilton"));
assert.ok(out.some((n) => n.placeId === "doubletree"));
assert.equal(out.find((n) => n.placeId === "hilton")?.rating, 4.3);

console.log("ok — workspace venue dedupe");
