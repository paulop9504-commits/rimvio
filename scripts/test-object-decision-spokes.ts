#!/usr/bin/env npx tsx
/**
 * Object Decision Spokes — Intent facets → map hub layout.
 */
import assert from "node:assert/strict";
import { buildIntentDecisionFacetProjection } from "@/lib/context-workspace/projection/build-intent-decision-facets";
import {
  buildObjectDecisionSpokes,
  spokeOffsetPx,
} from "@/lib/context-workspace/projection/build-object-decision-spokes";
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

const projection = buildIntentDecisionFacetProjection({
  entity,
  relations: [
    {
      id: "r1",
      kind: "nearby",
      fromId: "stendhal",
      toId: "namba",
      labelKo: "난바역",
      meters: 80,
      walkMinutes: 1,
    },
  ],
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
});

const set = buildObjectDecisionSpokes({
  entityId: entity.id,
  entityTitleKo: entity.title,
  projection,
  maxSpokes: 4,
});

assert.equal(set.entityId, "stendhal");
assert.equal(set.spokes.length, 4);
assert.ok(set.spokes.every((s) => s.linesKo.length >= 1));
assert.ok(set.spokes.some((s) => s.id === "why" && s.angleDeg === 270));

const why = set.spokes.find((s) => s.id === "why")!;
const off = spokeOffsetPx(why);
assert.ok(Math.abs(off.dx) < 1e-6);
assert.ok(off.dy < 0);

console.log("ok — object decision spokes from intent projection");
