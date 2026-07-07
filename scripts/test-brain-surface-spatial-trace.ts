#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildBrainSurfaceSpatialTraceArcs,
  pickBrainSurfaceSpatialTracePlaces,
} from "../lib/globe/brain-surface-spatial-trace";
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
    lat: 34.702,
    lng: 135.495,
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

const root = stub({
  id: "video",
  family: "media",
  anchorKind: "video_root",
  label: "오사카역",
  lat: 34.7024,
  lng: 135.4959,
});
const cafe = stub({
  id: "cafe",
  anchorKind: "inferred_place",
  family: "eatery",
  label: "근처 카페",
  confidence: 0.82,
  inferenceLabelKo: "영상 8분대",
  lat: 34.6687,
  lng: 135.5012,
});
const weak = stub({
  id: "weak",
  anchorKind: "inferred_place",
  confidence: 0.2,
  lat: 34.669,
  lng: 135.502,
});

const shadow = resolveBrainSurfaceMapMarkers({
  candidates: [root, cafe, weak],
  shadowExpanded: true,
  videoClusterId: "media:guide-1",
  videoGuideNodeId: "guide-1",
  hubLat: 34.7024,
  hubLng: 135.4959,
  activeCandidateId: "video",
});

assert.equal(shadow.length, 2);
assert.ok(shadow.every((row) => row.markerStyle === "trace"));
assert.ok(shadow.every((row) => row.calloutOffsetX == null));

const picked = pickBrainSurfaceSpatialTracePlaces({
  root,
  inferred: [cafe, weak],
});
assert.equal(picked.length, 1);
assert.equal(picked[0]?.id, "cafe");

const arcs = buildBrainSurfaceSpatialTraceArcs({
  root,
  places: picked,
  clusterId: "media:guide-1",
});
assert.equal(arcs.length, 1);
assert.equal(arcs[0]?.startLat, root.lat);

console.log("test-brain-surface-spatial-trace: ok");
