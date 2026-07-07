#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildBrainSurfaceMapFocusPanelContent,
  buildPersonalReplayMapFocusPanelContent,
} from "../lib/globe/build-map-focus-media-context-panel";
import type { MediaGuideNode } from "../lib/ontology/media-guide-types";
import type { BrainSurfaceProjectionCandidate } from "../lib/situation-projection/brain-surface-types";

const anchor: BrainSurfaceProjectionCandidate = {
  id: "video-root",
  eventId: "trip-osaka",
  nodeId: "node-1",
  family: "media",
  anchorKind: "video_root",
  label: "03남의 설렘 가득한 나혼자 5년만에 해외여행 in 오사카",
  previewTitle: "오사카 Ep.1",
  previewBody: null,
  placeLabel: "오사카",
  lat: 34.6956,
  lng: 135.4983,
  accent: "purple",
  badgeLabelKo: null,
  relationMemoKo: null,
  inferenceLabelKo: null,
  openUrl: null,
  embedUrl: "https://www.youtube.com/embed/demo",
  mapsUrl: null,
  searchQuery: null,
  sourceGuideNodeId: "guide:demo",
  revealOrder: 0,
  virtualCandidate: true,
};

const guide = {
  guideNodeId: "guide:demo",
  title: anchor.label,
  sourceKind: "youtube",
  sourceLabelKo: "유튜브",
  trustLevel: "video",
  trustLabelKo: "공개 참고",
  canonicalUrl: "https://youtube.com/watch?v=demo",
  openUrl: "https://youtube.com/watch?v=demo",
  embedUrl: anchor.embedUrl,
  thumbnailUrl: null,
  description: null,
  providerName: "YouTube",
  domain: "youtube.com",
  durationSeconds: 1200,
  moments: [
    {
      seconds: 192,
      timeLabel: "03:12",
      title: null,
      chipLabelKo: "난바 걷기",
    },
  ],
  primaryMoment: {
    seconds: 192,
    timeLabel: "03:12",
    title: null,
    chipLabelKo: "난바 걷기",
  },
  relatedExperienceEntityId: "entity:demo",
  relatedPlaceEntityId: null,
  relatedPlaceLabel: "오사카",
  relatedCaptureId: null,
  whyRelevantKo: "오사카 흐름이 보여서 03:12부터 바로 보기 좋아요",
  relevanceScore: 0.9,
  inferredPlaceCandidates: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} satisfies MediaGuideNode;

const related: BrainSurfaceProjectionCandidate[] = [
  {
    ...anchor,
    id: "eatery-1",
    family: "eatery",
    anchorKind: "inferred_place",
    label: "도톤보리 곱창",
    previewTitle: "도톤보리 곱창",
    inferenceLabelKo: "영상 12분대에 나온 곳",
    embedUrl: null,
    revealOrder: 1,
  },
  {
    ...anchor,
    id: "lodging-1",
    family: "lodging",
    anchorKind: "inferred_place",
    label: "난바 호텔",
    previewTitle: "난바 호텔",
    inferenceLabelKo: "영상 후반 숙소 구간",
    embedUrl: null,
    revealOrder: 2,
  },
];

const brainPanel = buildBrainSurfaceMapFocusPanelContent({
  anchor,
  related,
  mediaGuide: guide,
  inferredPlaceCount: 2,
  canExpandMap: true,
  canOpenDetail: true,
});

assert.equal(brainPanel.whyHereLine, guide.whyRelevantKo);
assert.equal(brainPanel.sceneMoments[0]?.timeLabel, "03:12");
assert.equal(brainPanel.connectionBuckets.length, 2);
assert.equal(brainPanel.primaryAction?.kind, "expand_map");
assert.equal(brainPanel.secondaryAction?.kind, "open_detail");

const replayPanel = buildPersonalReplayMapFocusPanelContent({
  contextPlaceLabel: "오사카",
  recallCaption: "그때 찍어 둔 난바 골목",
  canOpenBridge: true,
});

assert.match(replayPanel.whyHereLine, /난바|오사카/u);
assert.equal(replayPanel.primaryAction?.kind, "open_bridge");

console.log("test-map-focus-media-context-panel: ok");
