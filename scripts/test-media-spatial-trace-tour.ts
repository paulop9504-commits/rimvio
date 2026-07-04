import assert from "node:assert/strict";
import { buildMediaSpatialTraceTourStops } from "../lib/situation-projection/build-media-spatial-trace-tour";
import type { BrainSurfaceProjectionBatch } from "../lib/situation-projection/brain-surface-types";

const batch: BrainSurfaceProjectionBatch = {
  eventId: "evt-tokyo",
  createdAt: new Date(0).toISOString(),
  trigger: "brain_complete",
  candidates: [
    {
      id: "brain-surface:evt-tokyo:video:guide:tokyo",
      eventId: "evt-tokyo",
      nodeId: "ghost:media:guide:tokyo:root",
      family: "media",
      clusterId: "media:guide:tokyo",
      parentGuideNodeId: "guide:tokyo",
      anchorKind: "video_root",
      markerStyle: "solid",
      confidence: 0.9,
      confidenceLabelKo: "90%",
      inferenceLabelKo: null,
      spatialTraceItems: [],
      label: "도쿄 맛집 브이로그",
      previewTitle: "도쿄 맛집 브이로그",
      previewBody: "영상에서 이어진 후보예요",
      placeLabel: "도쿄",
      lat: 35.681,
      lng: 139.767,
      accent: "purple",
      badgeLabelKo: "영상",
      relationMemoKo: null,
      openUrl: "https://youtube.com/watch?v=test",
      embedUrl: "https://youtube.com/embed/test",
      mapsUrl: null,
      searchQuery: null,
      sourceGuideNodeId: "guide:tokyo",
      revealOrder: 0,
      virtualCandidate: true,
      memoCommitDraft: null,
    },
    {
      id: "brain-surface:evt-tokyo:inferred:guide:tokyo:c1",
      eventId: "evt-tokyo",
      nodeId: "ghost:media:guide:tokyo:c1",
      family: "eatery",
      clusterId: "media:guide:tokyo",
      parentGuideNodeId: "guide:tokyo",
      anchorKind: "inferred_place",
      markerStyle: "dashed",
      confidence: 0.87,
      confidenceLabelKo: "87%",
      inferenceLabelKo: "AI 추정",
      spatialTraceItems: null,
      label: "신주uku 라멘",
      previewTitle: "신주uku 라멘",
      previewBody: "제목에 등장",
      placeLabel: "신주uku",
      lat: 35.693,
      lng: 139.703,
      accent: "orange",
      badgeLabelKo: "AI 추정 87%",
      relationMemoKo: null,
      openUrl: null,
      embedUrl: null,
      mapsUrl: null,
      searchQuery: "신주uku 라멘",
      sourceGuideNodeId: "guide:tokyo",
      revealOrder: 1,
      virtualCandidate: true,
      memoCommitDraft: null,
    },
  ],
};

const stops = buildMediaSpatialTraceTourStops({
  batch,
  guideNodeId: "guide:tokyo",
});

assert.equal(stops.length, 2);
assert.equal(stops[0]?.kind, "video");
assert.equal(stops[1]?.kind, "place");
assert.equal(stops[1]?.labelKo, "신주uku 라멘");

console.log("test-media-spatial-trace-tour: ok");
