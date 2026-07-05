#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  layoutBrainSurfaceCalloutMarkers,
  resolveBrainSurfaceCalloutOffset,
} from "@/lib/globe/layout-brain-surface-callout-markers";
import { resolveNonOverlappingCalloutOffsets } from "@/lib/globe/resolve-non-overlapping-callout-offsets";
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

const offsets = resolveNonOverlappingCalloutOffsets(6);
assert.ok(new Set(offsets.map((row) => `${row.x},${row.y}`)).size === offsets.length);
assert.equal(resolveBrainSurfaceCalloutOffset(0, 6).x, offsets[0]?.x);

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
