import assert from "node:assert/strict";
import { resolveDiscoverySurfaceIncludesLodgingFromBatch } from "@/lib/globe/context-condition-ai/discovery-surface-includes-lodging";

assert.equal(
  resolveDiscoverySurfaceIncludesLodgingFromBatch({
    batchId: "batch-amenity",
    count: 3,
    summaryKo: "약국 3곳",
    atIso: new Date().toISOString(),
    spec: {
      resourceTypes: ["amenity"],
      transport: "walk",
      budget: "medium",
      vibe: "popular",
      lodgingKind: "any",
      radiusM: 2500,
    },
    recommendations: [
      {
        kind: "amenity",
        title: "○○약국",
        reasonKo: "가까워요",
        placeId: "pharmacy-1",
        lat: 37.5,
        lng: 127.0,
      },
    ],
  }),
  false,
);

assert.equal(
  resolveDiscoverySurfaceIncludesLodgingFromBatch({
    batchId: "batch-hotel",
    count: 2,
    summaryKo: "숙소 2곳",
    atIso: new Date().toISOString(),
    spec: {
      resourceTypes: ["hotel"],
      transport: "walk",
      budget: "medium",
      vibe: "popular",
      lodgingKind: "any",
      radiusM: 2500,
    },
    recommendations: [
      {
        kind: "lodging",
        title: "호텔 A",
        reasonKo: "가성비",
        placeId: "hotel-1",
        lat: 37.5,
        lng: 127.0,
      },
    ],
  }),
  true,
);

assert.equal(resolveDiscoverySurfaceIncludesLodgingFromBatch(null), true);

console.log("test-discovery-surface-includes-lodging: ok");
