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
  markerThumbnailUrl: "https://example.com/macro.jpg",
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
const video = stub({
  id: "video",
  family: "media",
  anchorKind: "video_root",
  embedUrl: "https://youtube.com/embed/x",
  markerThumbnailUrl: "https://i.ytimg.com/vi/x/hqdefault.jpg",
});

const core = resolveBrainSurfaceMapMarkers({
  candidates: [macro, micro, inferred, video],
  disclosureStage: "core",
  hubLat: 35.68,
  hubLng: 139.76,
});
assert.equal(core.length, 1);
assert.equal(core[0]?.id, "video");
assert.ok(core.every((row) => row.calloutOffsetX != null));

const story = resolveBrainSurfaceMapMarkers({
  candidates: [macro, micro, inferred, video],
  disclosureStage: "core",
  storySpread: true,
  activeCandidateId: "video",
  hubLat: 35.68,
  hubLng: 139.76,
});
assert.ok(story.length >= 1);
assert.ok(story.every((row) => row.markerStyle === "story"));
assert.ok(story.every((row) => row.calloutOffsetX == null));
const activeStory = story.find((row) => row.id === "video");
assert.ok(activeStory);
assert.ok((activeStory?.focusPriority ?? 0) >= 100);

assert.deepEqual(
  resolveBrainSurfaceMapMarkers({
    candidates: [macro, micro],
    disclosureStage: "related",
    activeCandidateId: "macro",
    hubLat: 35.68,
    hubLng: 139.76,
  }).map((row) => row.id).sort(),
  ["macro", "micro"],
);

const selected = resolveBrainSurfaceMapMarkers({
  candidates: [macro, micro],
  disclosureStage: "detail",
  activeCandidateId: "micro",
});
assert.equal(selected.length, 1);
assert.equal(selected[0]?.id, "micro");

const shadow = resolveBrainSurfaceMapMarkers({
  candidates: [inferred],
  shadowExpanded: true,
  videoClusterId: "media:guide-1",
  videoGuideNodeId: "guide-1",
  activeCandidateId: "inferred",
});
assert.equal(shadow.length, 1);
assert.equal(shadow[0]?.id, "inferred");
assert.equal(shadow[0]?.lat, 35.68);
assert.equal(shadow[0]?.calloutOffsetX ?? null, null);

console.log("test-resolve-brain-surface-map-markers: ok");
