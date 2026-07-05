#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  filterVisibleBrainSurfaceCandidates,
  hasExplicitMarkerThumbnail,
  isEmbeddableBrainSurfaceVideo,
} from "../lib/globe/brain-surface-marker-media";
import type { BrainSurfaceProjectionCandidate } from "../lib/situation-projection/brain-surface-types";

function stub(
  partial: Partial<BrainSurfaceProjectionCandidate>,
): BrainSurfaceProjectionCandidate {
  return {
    id: "id",
    eventId: "evt",
    nodeId: null,
    family: "lodging",
    label: "label",
    previewTitle: "title",
    previewBody: null,
    placeLabel: "place",
    lat: 35.68,
    lng: 139.76,
    accent: "blue",
    badgeLabelKo: null,
    relationMemoKo: null,
    openUrl: null,
    embedUrl: null,
    mapsUrl: null,
    searchQuery: null,
    sourceGuideNodeId: null,
    revealOrder: 0,
    virtualCandidate: true,
    memoCommitDraft: null,
    ...partial,
  };
}

assert.equal(hasExplicitMarkerThumbnail(null), false);
assert.equal(hasExplicitMarkerThumbnail("https://example.com/a.jpg"), true);

const ghost = stub({ family: "lodging", markerThumbnailUrl: null });
const hotel = stub({
  family: "lodging",
  markerThumbnailUrl: "https://example.com/hotel.jpg",
});
const video = stub({
  family: "media",
  anchorKind: "video_root",
  embedUrl: "https://youtube.com/embed/x",
  markerThumbnailUrl: "https://i.ytimg.com/vi/x/hqdefault.jpg",
});
const blocked = stub({
  family: "media",
  anchorKind: "video_root",
  embedUrl: null,
  openUrl: "https://youtube.com/watch?v=x",
});

assert.ok(isEmbeddableBrainSurfaceVideo(video));
assert.equal(isEmbeddableBrainSurfaceVideo(blocked), false);

const visible = filterVisibleBrainSurfaceCandidates([ghost, hotel, blocked, video]);
assert.deepEqual(
  visible.map((row) => row.id),
  [hotel.id, video.id],
);

console.log("test-brain-surface-marker-visibility: ok");
