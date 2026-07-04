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
    clusterId: null,
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
    sourceGuideNodeId: null,
    revealOrder: 0,
    virtualCandidate: false,
    memoCommitDraft: null,
    ...partial,
  };
}

const macro = stub({
  id: "macro",
  label: "가성비 숙소",
  virtualCandidate: true,
  family: "lodging",
});
const micro = stub({
  id: "micro",
  label: "사쿠라 호텔",
  markerThumbnailUrl: "https://example.com/hotel.jpg",
  family: "lodging",
});
const video = stub({
  id: "video",
  anchorKind: "video_root",
  embedUrl: "https://www.youtube.com/embed/x",
  family: "media",
});

const result = resolveBrainSurfaceMapMarkers({
  candidates: [macro, micro, video],
  activeCandidateId: null,
});

assert.equal(result.some((row) => row.id === "macro"), false);
assert.equal(result.some((row) => row.id === "video"), false);
assert.equal(result.some((row) => row.id === "micro"), true);
assert.equal(result[0]?.calloutOffsetX, undefined);

console.log("test-resolve-brain-surface-map-markers: ok");
