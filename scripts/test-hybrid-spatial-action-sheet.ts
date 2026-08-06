#!/usr/bin/env npx tsx
/**
 * Hybrid 2-step: Spatial Projection (spokes) → Action/Booking Sheet.
 * Restaurant Why must not use lodging fallback copy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildIntentDecisionFacetProjection } from "@/lib/context-workspace/projection/build-intent-decision-facets";
import type { MobileWorkspaceEntity } from "@/lib/mobile-workspace/types";
import {
  clearMobileWorkspaceForTests,
  dispatchMobileWorkspace,
  readMobileWorkspace,
} from "@/lib/mobile-workspace";

const root = process.cwd();
const mobileSrc = readFileSync(
  join(root, "components/mobile-workspace/MobileWorkspace.tsx"),
  "utf8",
);

assert.ok(mobileSrc.includes("actionSheetOpen"));
assert.ok(mobileSrc.includes("data-spatial-projection-hint"));
assert.ok(mobileSrc.includes("data-action-booking-sheet"));
assert.ok(mobileSrc.includes('type: "close_facet"'));
assert.ok(
  mobileSrc.includes("Callout · 핀을 탭하면 자세히") ||
    mobileSrc.includes("spatial-projection-hint") ||
    mobileSrc.includes("data-spatial-why-highlight") ||
    mobileSrc.includes("탭하면 가격"),
);
// Stage 1 must not force open_facet on first hotel/restaurant select
assert.ok(
  mobileSrc.includes('ent?.kind !== "hotel" && ent?.kind !== "restaurant"'),
);

clearMobileWorkspaceForTests();
dispatchMobileWorkspace({
  type: "hydrate",
  contextId: "ctx_hybrid",
  contextTitleKo: "오사카",
  entities: [
    {
      id: "hotel_1",
      kind: "hotel",
      title: "STENDHAL",
      lat: 34.66,
      lng: 135.5,
      score: 46,
      subtitleKo: null,
      priceLabelKo: "₩98000",
    },
  ],
});
dispatchMobileWorkspace({ type: "set_active", entityId: "hotel_1" });
let s = readMobileWorkspace()!;
assert.equal(s.calloutMode, "compact", "1st select = Spatial Projection");
assert.equal(s.activeFacetId, null);

dispatchMobileWorkspace({ type: "open_facet", facetId: "price" });
s = readMobileWorkspace()!;
assert.equal(s.calloutMode, "expanded", "spoke/facet tap = Action Sheet");
assert.equal(s.activeFacetId, "price");

dispatchMobileWorkspace({ type: "close_facet" });
s = readMobileWorkspace()!;
assert.equal(s.calloutMode, "compact", "sheet close returns to Spatial");
assert.equal(s.activeEntityId, "hotel_1");

const sushi: MobileWorkspaceEntity = {
  id: "sushi",
  kind: "restaurant",
  title: "스시 하야타",
  lat: 34.67,
  lng: 135.5,
  score: 46,
  subtitleKo: "오사카 · 맛집",
  priceLabelKo: null,
};
const resto = buildIntentDecisionFacetProjection({
  entity: sushi,
  relations: [],
  intentText: "맛집 찾아",
  query: "오사카 맛집",
  summaryKo: "오사카 여행",
});
const why = resto.facets.find((f) => f.id === "why")!;
assert.ok(
  !why.linesKo.some((l) => /숙소 검색/u.test(l)),
  "restaurant must not use lodging why fallback",
);
assert.ok(
  why.linesKo.some((l) => /맛집/u.test(l)),
  "restaurant why should mention 맛집",
);
assert.match(resto.intentLabelKo, /맛집|Intent:/);

console.log("ok — hybrid 2-step + restaurant why domain");
