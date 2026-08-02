/**
 * Smoke: ObjectRelation API + Explore buckets.
 */
import assert from "node:assert/strict";
import {
  buildCalloutViewModel,
  getRelations,
  resolveObjectRelationRole,
  rimvioObjectFromWorkspaceNode,
} from "@/lib/callout";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import type { NodePreviewModel } from "@/lib/context-workspace/build-node-preview";

const hotel: ContextWorkspaceNode = {
  id: "hotel_123",
  kind: "lodging",
  placeId: "p1",
  title: "Namba Hotel",
  summaryKo: "난바",
  lat: 34.66,
  lng: 135.5,
  rating: 8.8,
  priceBand: 2,
  amountLabel: "120,000원",
  thumbnailUrl: null,
  tags: [],
  visible: true,
  selected: true,
  bookmarked: false,
  source: "test",
};

const sushi: ContextWorkspaceNode = {
  id: "rest_1",
  kind: "eatery",
  placeId: "p2",
  title: "Sushi Bar",
  summaryKo: "스시",
  lat: 34.661,
  lng: 135.501,
  rating: 4.5,
  priceBand: 2,
  amountLabel: null,
  thumbnailUrl: null,
  tags: [],
  visible: true,
  selected: false,
  bookmarked: false,
  source: "test",
};

const cafe: ContextWorkspaceNode = {
  id: "cafe_1",
  kind: "eatery",
  placeId: "p3",
  title: "Blue Cafe",
  summaryKo: "카페",
  lat: 34.662,
  lng: 135.502,
  rating: 4.2,
  priceBand: 1,
  amountLabel: null,
  thumbnailUrl: null,
  tags: ["cafe"],
  visible: true,
  selected: false,
  bookmarked: true,
  source: "test",
};

const station: ContextWorkspaceNode = {
  id: "amenity_1",
  kind: "amenity",
  placeId: "p4",
  title: "Namba Station",
  summaryKo: "지하철",
  lat: 34.659,
  lng: 135.499,
  rating: null,
  priceBand: null,
  amountLabel: null,
  thumbnailUrl: null,
  tags: ["subway"],
  visible: true,
  selected: false,
  bookmarked: false,
  source: "test",
};

const hotelB: ContextWorkspaceNode = {
  ...hotel,
  id: "hotel_b",
  title: "B Hotel",
  lat: 34.665,
  lng: 135.505,
  selected: false,
};

const nodes = [hotel, sushi, cafe, station, hotelB];
const ctx = {
  origin: hotel,
  nodes,
  edges: [
    {
      id: "e1",
      kind: "nearby" as const,
      fromId: "hotel_123",
      toId: "rest_1",
      labelKo: "맛집",
      meters: 180,
    },
  ],
  routeNodeIds: ["hotel_123", "rest_1", "amenity_1"],
};

assert.equal(resolveObjectRelationRole(sushi), "restaurant");
assert.equal(resolveObjectRelationRole(cafe), "cafe");
assert.equal(resolveObjectRelationRole(station), "transport");

const nearby = getRelations("hotel_123", "nearby", ctx);
assert.ok(nearby.length >= 1);
assert.ok(nearby.some((r) => r.role === "restaurant"));
assert.ok(nearby.every((r) => r.lineCoords.length === 2));

const similar = getRelations("hotel_123", "similar", ctx);
assert.ok(similar.some((r) => r.toObjectId === "hotel_b"));
assert.ok(similar.every((r) => r.role === "peer"));

const connected = getRelations("hotel_123", "connected", ctx);
assert.ok(connected.some((r) => r.toObjectId === "rest_1" || r.toObjectId === "cafe_1"));

const route = getRelations("hotel_123", "route", ctx);
assert.ok(route.some((r) => r.toObjectId === "rest_1"));

const preview: NodePreviewModel = {
  nodeId: hotel.id,
  kind: "lodging",
  title: hotel.title,
  kindLabelKo: "숙소",
  heroImage: null,
  galleryImages: [],
  imageCountHint: 0,
  rating: 8.8,
  ratingLabel: "★ 8.8",
  price: "120,000원",
  reviewSummary: "후기 40",
  whyChosen: "난바역 4분 · 예산 범위",
  amenities: [],
  nearby: [],
  selected: true,
  bookmarked: false,
  inCompare: false,
  canPrepare: true,
  capabilities: ["book_room"],
};

const object = rimvioObjectFromWorkspaceNode({
  node: hotel,
  preview,
  contextId: "ctx",
});

const model = buildCalloutViewModel({
  object,
  relationBuckets: {
    nearby,
    similar,
    connected,
    route,
  },
});

assert.ok(model);
assert.ok(model!.explore.buckets.nearby.length >= 1);
assert.ok(
  model!.explore.buckets.nearby.some((r) => r.roleLabelKo === "Restaurant"),
);

console.log(
  "ok object-relation",
  `nearby=${nearby.map((r) => r.role).join(",")}`,
  `similar=${similar.length}`,
  `connected=${connected.length}`,
  `route=${route.length}`,
);
