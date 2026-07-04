#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  filterBrainSurfaceCandidatesForDisclosure,
  isCoreBrainSurfaceCandidate,
  pickCoreBrainSurfaceCandidates,
  resolveBrainSurfaceDisclosureStage,
  resolveRelatedBrainSurfaceCandidates,
} from "../lib/globe/brain-surface-progressive-disclosure";
import type { BrainSurfaceProjectionCandidate } from "../lib/situation-projection/brain-surface-types";

function stub(
  partial: Partial<BrainSurfaceProjectionCandidate>,
): BrainSurfaceProjectionCandidate {
  return {
    id: "id",
    eventId: "evt",
    nodeId: null,
    family: "eatery",
    clusterId: "media:guide-1",
    focusAffinityFamilies: ["eatery", "media"],
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

const video = stub({
  id: "video",
  family: "media",
  anchorKind: "video_root",
  clusterId: "media:guide-1",
  embedUrl: "https://youtube.com/embed/x",
  revealOrder: 0,
});
const lodgingMacro = stub({
  id: "lodging-macro",
  family: "lodging",
  clusterId: "node:lodging:lodging",
  revealOrder: 1,
});
const lodgingMacro2 = stub({
  id: "lodging-macro-2",
  family: "lodging",
  label: "역세권",
  clusterId: "node:lodging:lodging",
  revealOrder: 3,
});
const inferred = stub({
  id: "inferred",
  anchorKind: "inferred_place",
  family: "lodging",
  parentGuideNodeId: "guide-1",
  markerThumbnailUrl: "https://example.com/h.jpg",
  revealOrder: 2,
});
const memo = stub({
  id: "memo",
  family: "memo",
  clusterId: "memo:lodging",
  revealOrder: 4,
});

assert.equal(resolveBrainSurfaceDisclosureStage({
  activeCandidateId: null,
  shadowExpanded: false,
  detailMode: false,
  hasActiveNode: false,
}), "core");

assert.equal(resolveBrainSurfaceDisclosureStage({
  activeCandidateId: "video",
  shadowExpanded: false,
  detailMode: false,
  hasActiveNode: false,
}), "related");

assert.equal(resolveBrainSurfaceDisclosureStage({
  activeCandidateId: "video",
  shadowExpanded: false,
  detailMode: true,
  hasActiveNode: true,
}), "detail");

assert.equal(isCoreBrainSurfaceCandidate(inferred), false);
assert.equal(isCoreBrainSurfaceCandidate(memo), false);
assert.ok(isCoreBrainSurfaceCandidate(video));
assert.ok(isCoreBrainSurfaceCandidate(lodgingMacro));

const core = pickCoreBrainSurfaceCandidates([
  video,
  lodgingMacro,
  lodgingMacro2,
  inferred,
  memo,
]);
assert.equal(core.length, 2);
assert.deepEqual(
  core.map((row) => row.id).sort(),
  ["lodging-macro", "video"],
);

const related = resolveRelatedBrainSurfaceCandidates({
  active: video,
  candidates: [video, inferred, lodgingMacro, memo],
});
assert.deepEqual(
  related.map((row) => row.id),
  ["video", "inferred"],
);

const disclosed = filterBrainSurfaceCandidatesForDisclosure({
  candidates: [video, lodgingMacro, inferred],
  stage: "core",
  activeCandidate: null,
});
assert.equal(disclosed.length, 2);

console.log("test-brain-surface-progressive-disclosure: ok");
