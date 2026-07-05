#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  filterBrainSurfaceMapPinCandidates,
  isBrainSurfaceMapPinCandidate,
} from "../lib/globe/brain-surface-map-pin-visibility";
import type { BrainSurfaceProjectionCandidate } from "../lib/situation-projection/brain-surface-types";

function stub(partial: Partial<BrainSurfaceProjectionCandidate>): BrainSurfaceProjectionCandidate {
  return {
    id: "id",
    eventId: "evt",
    nodeId: null,
    family: "eatery",
    clusterId: "cluster",
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

assert.equal(isBrainSurfaceMapPinCandidate(stub({ virtualCandidate: true })), false);
assert.equal(
  isBrainSurfaceMapPinCandidate(
    stub({ virtualCandidate: false, markerThumbnailUrl: "https://x/y.jpg" }),
  ),
  true,
);
assert.equal(
  isBrainSurfaceMapPinCandidate(
    stub({
      anchorKind: "inferred_place",
      virtualCandidate: true,
      markerThumbnailUrl: null,
    }),
  ),
  true,
);

const filtered = filterBrainSurfaceMapPinCandidates([
  stub({ id: "virtual", virtualCandidate: true, label: "골목" }),
  stub({ id: "real", markerThumbnailUrl: "https://x/y.jpg", label: "라멘" }),
]);
assert.deepEqual(filtered.map((row) => row.id), ["real"]);

console.log("test-brain-surface-map-pin-visibility: ok");
