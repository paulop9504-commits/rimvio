/**
 * Smoke: Object Callout registry + model — new types via registry only.
 */
import assert from "node:assert/strict";
import {
  buildCalloutViewModel,
  getCalloutObjectTypeDescriptor,
  listCalloutObjectTypes,
  registerCalloutObjectType,
  rimvioObjectFromWorkspaceNode,
  workspaceKindToRimvioObjectType,
} from "@/lib/callout";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import type { NodePreviewModel } from "@/lib/context-workspace/build-node-preview";
import type { CalloutObjectTypeDescriptor, RimvioObject } from "@/lib/callout/types";

assert.equal(workspaceKindToRimvioObjectType("lodging"), "hotel");
assert.equal(workspaceKindToRimvioObjectType("eatery"), "restaurant");
assert.ok(getCalloutObjectTypeDescriptor("hotel"));
assert.ok(listCalloutObjectTypes().length >= 5);

const node: ContextWorkspaceNode = {
  id: "hotel_123",
  kind: "lodging",
  placeId: "p1",
  title: "Namba Hotel",
  summaryKo: "난바 중심",
  lat: 34.66,
  lng: 135.5,
  rating: 8.8,
  priceBand: 2,
  amountLabel: "120,000원",
  thumbnailUrl: null,
  tags: ["reservable"],
  visible: true,
  selected: true,
  bookmarked: false,
  source: "test",
  actionReadyState: "prepare",
};

const preview: NodePreviewModel = {
  nodeId: node.id,
  kind: "lodging",
  title: node.title,
  kindLabelKo: "숙소",
  heroImage: null,
  galleryImages: [],
  imageCountHint: 0,
  rating: 8.8,
  ratingLabel: "★ 8.8",
  price: "120,000원",
  reviewSummary: "후기 40",
  whyChosen: "난바역 4분 · 이전 선호 지역 · 예산 범위",
  amenities: ["예약 가능"],
  nearby: [
    { kind: "eatery", labelKo: "🍣 맛집 3분", meters: 240, nodeId: "n2" },
  ],
  selected: true,
  bookmarked: false,
  inCompare: false,
  canPrepare: true,
  capabilities: ["book_room"],
};

const object = rimvioObjectFromWorkspaceNode({
  node,
  preview,
  contextId: "ctx_1",
  draftDayLabelKo: "Day 2",
});

assert.equal(object.id, "hotel_123");
assert.equal(object.type, "hotel");
assert.equal(object.state, "shortlisted");
assert.ok(object.evidence.some((e) => e.type === "price" && e.present));
assert.ok(object.evidence.every((e) => e.graphRef != null || !e.present));
assert.ok(object.evidence.some((e) => e.type === "distance" && e.graphRef?.kind === "edge"));

const model = buildCalloutViewModel({
  object,
  neighbors: [
    {
      objectId: "n2",
      title: "Sushi",
      kindKey: "eatery",
      labelKo: "맛집",
      meters: 240,
    },
  ],
  alternatives: [
    {
      objectId: "hotel_b",
      title: "B Hotel",
      priceLabelKo: "98,000원",
      priceWon: 98000,
      metersFromCurrent: 900,
      rating: 8.2,
      lat: 34.67,
      lng: 135.51,
    },
  ],
});

assert.ok(model);
assert.ok(model!.observe.aiScore >= 70);
assert.ok(model!.observe.evidence.length >= 3);
assert.deepEqual(
  [...model!.modes],
  ["observe", "explore", "simulate", "prepare", "commit"],
);
assert.ok(model!.explore.edges.some((e) => e.relationId === "restaurant"));
assert.ok(model!.explore.buckets);
assert.equal(model!.simulate.deltas.length, 1);
assert.ok(model!.prepare.steps.length >= 3);
assert.equal(model!.commit.ctaKo.includes("Field"), true);

/** Extensibility: register new type without touching Callout Core. */
const custom: CalloutObjectTypeDescriptor = {
  type: "product",
  labelKo: "커스텀상품",
  modes: ["observe", "prepare", "commit"],
  intentAxes: [{ id: "price", labelKo: "가격", nudge: "down" }],
  exploreRelations: [],
  prepareStepDefs: [
    {
      id: "price",
      labelKo: "가격",
      isDone: (o: RimvioObject) => Boolean(o.facts.priceLabelKo),
    },
  ],
  connectTargets: [],
  askPlaceholderKo: "물어보세요",
  prepareCtaKo: "구매 검토",
  commitCtaKo: "Field에서 검토",
  simulateEmptyKo: "없음",
};
registerCalloutObjectType(custom);
const overridden = getCalloutObjectTypeDescriptor("product");
assert.equal(overridden?.labelKo, "커스텀상품");
assert.deepEqual([...overridden!.modes], ["observe", "prepare", "commit"]);

console.log(
  "ok object-callout",
  object.type,
  object.state,
  `modes=${model!.modes.join(",")}`,
  `explore=${model!.explore.edges.length}`,
  `sim=${model!.simulate.deltas.length}`,
);
