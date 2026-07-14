import assert from "node:assert/strict";
import { resolveDiscoverySurfaceIncludesLodgingFromBatch } from "@/lib/globe/context-condition-ai/discovery-surface-includes-lodging";
import type { ContextConditionLastBatchWire } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";

const hotelBatch: ContextConditionLastBatchWire = {
  batchId: "batch-hotel",
  count: 3,
  summaryKo: "호텔 3곳",
  atIso: new Date().toISOString(),
  triggerMessage: "주변 호텔",
  spec: {
    version: 1,
    resourceTypes: ["hotel"],
    transport: "walk",
    budget: "medium",
    vibe: "popular",
    lodgingKind: "any",
    radiusM: 800,
  },
  recommendations: [
    {
      kind: "lodging",
      title: "Hotel A",
      reasonKo: "가까움",
      placeId: "hotel-a",
      lat: 34.7,
      lng: 135.5,
    },
  ],
};

const pharmacyBatch: ContextConditionLastBatchWire = {
  batchId: "batch-pharmacy",
  count: 2,
  summaryKo: "약국 2곳",
  atIso: new Date().toISOString(),
  triggerMessage: "약국 찾기",
  spec: {
    version: 1,
    resourceTypes: ["amenity"],
    transport: "walk",
    budget: "medium",
    vibe: "popular",
    lodgingKind: "any",
    radiusM: 600,
  },
  recommendations: [
    {
      kind: "amenity",
      title: "Sugi Pharmacy",
      reasonKo: "9분 거리",
      placeId: "pharmacy-a",
      lat: 34.71,
      lng: 135.51,
    },
  ],
};

assert.equal(resolveDiscoverySurfaceIncludesLodgingFromBatch(hotelBatch), true);
assert.equal(resolveDiscoverySurfaceIncludesLodgingFromBatch(pharmacyBatch), false);
assert.notEqual(hotelBatch.batchId, pharmacyBatch.batchId);
assert.equal(pharmacyBatch.recommendations?.every((row) => row.kind !== "lodging"), true);

console.log("test-discovery-execution-isolation ok");
