#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resolveBrainSurfaceMapMarkers } from "../lib/globe/resolve-brain-surface-map-markers";
import type { BrainSurfaceProjectionCandidate } from "../lib/situation-projection/brain-surface-types";

function stub(partial: Partial<BrainSurfaceProjectionCandidate>): BrainSurfaceProjectionCandidate {
  return {
    id: "id",
    eventId: "evt",
    nodeId: null,
    family: "eatery",
    clusterId: "media:guide-1",
    focusAffinityFamilies: [],
    label: "label",
    previewTitle: "title",
    previewBody: null,
    placeLabel: "place",
    lat: 35.68,
    lng: 139.76,
    accent: "orange",
    badgeLabelKo: null,
    relationMemoKo: null,
    sourceLabelKo: null,
    validityLabelKo: null,
    evidenceKind: null,
    primaryActionLabelKo: null,
    openUrl: null,
    embedUrl: null,
    mapsUrl: null,
    searchQuery: null,
    sourceGuideNodeId: "guide-1",
    revealOrder: 0,
    virtualCandidate: true,
    memoCommitDraft: null,
    ...partial,
  };
}

const macro = stub({
  id: "macro",
  label: "가성비 숙소",
  virtualCandidate: true,
  family: "lodging",
  anchorKind: null,
});
const micro = stub({
  id: "micro",
  label: "사쿠라 호텔",
  markerThumbnailUrl: "https://example.com/hotel.jpg",
  family: "lodging",
  anchorKind: "inferred_place",
});
const inferred = stub({
  id: "inferred",
  anchorKind: "inferred_place",
  label: "신주쿠 라멘",
  markerThumbnailUrl: "https://example.com/ramen.jpg",
  family: "eatery",
});

assert.deepEqual(
  resolveBrainSurfaceMapMarkers({ candidates: [macro, micro, inferred], activeCandidateId: null }),
  [],
);

assert.deepEqual(
  resolveBrainSurfaceMapMarkers({ candidates: [macro, micro], activeCandidateId: "macro" }),
  [],
);

const selected = resolveBrainSurfaceMapMarkers({
  candidates: [macro, micro],
  activeCandidateId: "micro",
});
assert.equal(selected.length, 1);
assert.equal(selected[0]?.id, "micro");

const shadow = resolveBrainSurfaceMapMarkers({
  candidates: [macro, inferred],
  shadowExpanded: true,
  videoClusterId: "media:guide-1",
  hubLat: 35.68,
  hubLng: 139.76,
  activeCandidateId: "inferred",
});
assert.equal(shadow.length, 1);
assert.equal(shadow[0]?.id, "inferred");
assert.ok(shadow[0]?.calloutOffsetX != null);
assert.equal(macro.clusterId, shadow[0]?.clusterId);

console.log("test-resolve-brain-surface-map-markers: ok");
