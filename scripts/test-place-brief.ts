/**
 * Place Brief — deterministic facts blocks for Workspace place sheet.
 * Run: npx tsx scripts/test-place-brief.ts
 */
import assert from "node:assert/strict";
import {
  buildPlaceBriefFactPack,
  buildPlaceBriefFromFacts,
  clearPlaceBriefCache,
} from "@/lib/context-workspace/place-brief";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

clearPlaceBriefCache();

const node: ContextWorkspaceNode = {
  id: "ws-node:liteapi:hotel-1",
  kind: "lodging",
  placeId: "hotel-1",
  title: "HOTEL LiVEMAX Shinsaibashi East",
  summaryKo: "12분 · 0.8km",
  lat: 34.67,
  lng: 135.5,
  rating: 4.3,
  priceBand: 2,
  amountLabel: "232,794원",
  reviewCount: 120,
  thumbnailUrl: null,
  tags: ["lodging", "reservable", "stay", "day_1"],
  visible: true,
  selected: true,
  bookmarked: false,
  source: "search",
  actionReadyState: "approved",
};

const pack = buildPlaceBriefFactPack({
  node,
  destinationKo: "오사카",
  inventory: {
    placeId: "liteapi:hotel-1",
    name: node.title,
    images: [],
    lat: node.lat,
    lng: node.lng,
    priceKrw: 232794,
    rating: 4.3,
    reviewCount: 120,
    address: "Osaka, Shinsaibashi",
    partnerLabel: "LiteAPI",
    checkInIso: "2026-08-10",
    checkOutIso: "2026-08-14",
  },
});

const brief = buildPlaceBriefFromFacts(pack);
assert.equal(brief.kind, "lodging");
assert.ok(brief.routeFitKo?.includes("동선") || brief.routeFitKo?.includes("12분"));
assert.ok(brief.introKo && brief.introKo.length > 20);
assert.ok(brief.featuresKo.length >= 2);
assert.ok(brief.reviewSummaryKo);
assert.ok(brief.knowBefore.some((k) => k.labelKo === "주소"));
assert.ok(brief.knowBefore.some((k) => k.labelKo === "일정"));
assert.equal(brief.source, "facts");

console.log("ok: place brief facts");
