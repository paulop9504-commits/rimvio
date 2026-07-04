#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  layoutBrainSurfaceCalloutMarkers,
  resolveBrainSurfaceCalloutOffset,
} from "@/lib/globe/layout-brain-surface-callout-markers";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

function seedCandidate(
  id: string,
  revealOrder: number,
): BrainSurfaceProjectionCandidate {
  return {
    id,
    eventId: "evt-1",
    nodeId: id,
    family: "lodging",
    label: id,
    previewTitle: id,
    previewBody: null,
    placeLabel: "도쿄",
    lat: 35.68,
    lng: 139.76,
    accent: "blue",
    badgeLabelKo: "숙소",
    relationMemoKo: null,
    openUrl: null,
    embedUrl: null,
    mapsUrl: null,
    searchQuery: null,
    sourceGuideNodeId: null,
    revealOrder,
    virtualCandidate: true,
  };
}

const offsets = [0, 1, 2, 3, 4, 5].map((index) =>
  resolveBrainSurfaceCalloutOffset(index, 6),
);
const distances = offsets.map((offset) => Math.hypot(offset.x, offset.y));
assert.ok(distances.every((value) => value >= 70));
assert.ok(new Set(offsets.map((row) => `${row.x},${row.y}`)).size === offsets.length);

const laidOut = layoutBrainSurfaceCalloutMarkers({
  candidates: [
    seedCandidate("a", 0),
    seedCandidate("b", 1),
    seedCandidate("c", 2),
  ],
  hubLat: 36.35,
  hubLng: 127.34,
});

assert.equal(laidOut.length, 3);
for (const row of laidOut) {
  assert.equal(row.lat, 36.35);
  assert.equal(row.lng, 127.34);
  assert.ok(row.calloutOffsetX != null);
  assert.ok(row.calloutOffsetY != null);
}

console.log("test-brain-surface-callout-layout: ok");
