#!/usr/bin/env npx tsx
/**
 * Intent-adaptive Decision facets — Labels + Evidence change with Intent.
 */
import assert from "node:assert/strict";
import {
  buildIntentDecisionFacetProjection,
  buildWorkspaceIntentLabelKo,
  resolveIntentCriteriaWeights,
} from "@/lib/context-workspace/projection/build-intent-decision-facets";
import type { MobileWorkspaceEntity } from "@/lib/mobile-workspace/types";

const entity: MobileWorkspaceEntity = {
  id: "stendhal",
  kind: "hotel",
  title: "STENDHAL GUESTHOUSE",
  subtitleKo: "난바 · 캡슐",
  lat: 34.665,
  lng: 135.501,
  priceLabelKo: "₩98,000",
  score: 46,
  thumbnailUrl: null,
  galleryUrls: null,
  isSlotSkeleton: false,
};

const relations = [
  {
    id: "r1",
    kind: "nearby" as const,
    fromId: "stendhal",
    toId: "namba",
    labelKo: "난바역",
    meters: 80,
    walkMinutes: 1,
  },
];

const capsule = buildIntentDecisionFacetProjection({
  entity,
  relations,
  intentText: "난바역 근처 가장 가까운 캡슐호텔",
  realityPlan: {
    stayType: "capsule",
    maxPriceBand: null,
    minRating: null,
    stationNear: true,
    onsenRequired: false,
    editCount: 1,
    lastEditKo: "캡슐",
    updatedAtIso: new Date().toISOString(),
  },
  query: "오사카 숙소",
  summaryKo: "오사카 여행",
});

assert.match(capsule.intentLabelKo, /Intent:/);
assert.match(capsule.intentLabelKo, /캡슐|역/);
assert.equal(capsule.stayType, "capsule");

const why = capsule.facets.find((f) => f.id === "why")!;
assert.equal(why.titleKo, "왜 이 장소인지");
assert.ok(why.linesKo.some((l) => /역|캡슐|가성비|이동/u.test(l)));

const price = capsule.facets.find((f) => f.id === "price")!;
assert.ok(price.linesKo.some((l) => /₩|원|가격/u.test(l)));

const trace = capsule.facets.find((f) => f.id === "review")!;
assert.equal(trace.titleKo, "AI Decision Trace");
assert.ok(trace.linesKo.some((l) => /거리|가격|%/.test(l)));
assert.equal(trace.labelKo, "판단");

const nearby = capsule.facets.find((f) => f.id === "nearby")!;
assert.match(nearby.titleKo, /Spatial|동선/);
assert.ok(nearby.linesKo.some((l) => /난바/u.test(l)));

const distanceBar = capsule.weights.find((w) => w.id === "distance")!;
const cheapPlan = {
  stayType: "hotel" as const,
  maxPriceBand: 2,
  minRating: null,
  stationNear: false,
  onsenRequired: false,
  editCount: 2,
  lastEditKo: "가성비",
  updatedAtIso: new Date().toISOString(),
};

const cheap = buildIntentDecisionFacetProjection({
  entity,
  relations,
  intentText: "더 싼 호텔",
  realityPlan: cheapPlan,
  query: "오사카 숙소",
});

const cheapPrice = cheap.facets.find((f) => f.id === "price")!;
assert.equal(cheapPrice.labelKo, "가성비");
assert.match(cheapPrice.titleKo, /Pricing|가격/);

const wCapsule = resolveIntentCriteriaWeights({
  realityPlan: {
    stayType: "capsule",
    maxPriceBand: null,
    minRating: null,
    stationNear: true,
    onsenRequired: false,
    editCount: 1,
    lastEditKo: "",
    updatedAtIso: new Date().toISOString(),
  },
  intentText: "역 근처 캡슐",
});
const wCheap = resolveIntentCriteriaWeights({
  realityPlan: cheapPlan,
  intentText: "더 싼 호텔",
});
assert.ok(
  wCapsule.location > wCheap.location,
  "station intent must raise location weight",
);
assert.ok(
  wCheap.price > wCapsule.price,
  "budget intent must raise price weight",
);

const label = buildWorkspaceIntentLabelKo({
  realityPlan: {
    stayType: "capsule",
    maxPriceBand: null,
    minRating: null,
    stationNear: true,
    onsenRequired: false,
    editCount: 1,
    lastEditKo: "",
    updatedAtIso: new Date().toISOString(),
  },
  summaryKo: "난바 여행",
});
assert.match(label, /^Intent:/);
assert.ok(distanceBar.percent > 0);

console.log("ok — intent-adaptive Decision facets (capsule vs cheap)");
