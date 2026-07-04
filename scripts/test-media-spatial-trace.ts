#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetMediaGuideStoreForTests } from "../lib/ontology/media-guide-store";
import type { MediaGuideNode } from "../lib/ontology/media-guide-types";
import { asRimvioEntityId } from "../lib/ontology/entity-types";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  buildMediaSpatialTraceCandidates,
  buildMediaSpatialTraceItems,
} from "../lib/situation-projection/build-media-spatial-trace";
import { projectBrainSurfaceBatch } from "../lib/situation-projection/project-brain-surface-batch";
import type { SituationProjectionManifest } from "../lib/situation-projection/types";

resetMediaGuideStoreForTests();

const event: EventCandidate = {
  id: "ev-spatial-trace",
  title: "교토 여행",
  category: "travel",
  source: "message",
  lifecycle: "active",
  place: "교토",
  confidence: 0.92,
  metadata: {},
  lifecycleUpdatedAt: "2026-07-04T00:00:00.000Z",
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
};

const guide: MediaGuideNode = {
  guideNodeId: "guide:kyoto-night-walk",
  title: "교토 밤 산책",
  sourceKind: "youtube",
  sourceLabelKo: "YouTube",
  trustLevel: "video",
  trustLabelKo: "영상",
  canonicalUrl: "https://www.youtube.com/watch?v=kyoto-night",
  openUrl: "https://www.youtube.com/watch?v=kyoto-night",
  embedUrl: "https://www.youtube.com/embed/kyoto-night",
  thumbnailUrl: "https://i.ytimg.com/vi/kyoto-night/hqdefault.jpg",
  description: "기온 거리 야경 산책 후 심야 라멘",
  providerName: "Kyoto Walk",
  domain: "youtube.com",
  durationSeconds: 540,
  youtubeOfficial: null,
  moments: [],
  primaryMoment: null,
  relatedExperienceEntityId: asRimvioEntityId("experience", event.id),
  relatedPlaceEntityId: null,
  relatedPlaceLabel: "교토",
  relatedCaptureId: "cap-kyoto",
  whyRelevantKo: "밤 동선과 식사 흐름을 바로 볼 수 있어요",
  relevanceScore: 0.91,
  inferredPlaceCandidates: [
    {
      candidateId: "gion",
      label: "기온 거리",
      semanticType: "place",
      semanticTypeLabelKo: "갈 곳",
      source: "title",
      sourceLabelKo: "제목",
      snippetKo: "기온 거리 야경",
      whyCandidateKo: "영상 제목·설명에서 확인된 랜드마크 후보",
      areaLabel: "교토",
      cuisineHint: null,
      situationalHintsKo: ["늦은 시간"],
      confidence: 0.92,
      searchProfile: {
        query: "기온 거리",
        areaLabel: "교토",
        countryBias: "JP",
        providerBias: "google",
        searchLocale: "ko",
        anchorLabel: "교토",
        anchorLat: 35.0116,
        anchorLng: 135.7681,
      },
      lat: 35.0037,
      lng: 135.7788,
      mapPlacement: "map_anchor",
    },
    {
      candidateId: "yasaka",
      label: "야사카 신사",
      semanticType: "place",
      semanticTypeLabelKo: "갈 곳",
      source: "description",
      sourceLabelKo: "설명",
      snippetKo: "야사카 신사 근처",
      whyCandidateKo: "영상 설명에 등장하는 신사 후보",
      areaLabel: "교토",
      cuisineHint: null,
      situationalHintsKo: [],
      confidence: 0.81,
      searchProfile: {
        query: "야사카 신사",
        areaLabel: "교토",
        countryBias: "JP",
        providerBias: "google",
        searchLocale: "ko",
        anchorLabel: "교토",
        anchorLat: 35.0116,
        anchorLng: 135.7681,
      },
      lat: 35.0036,
      lng: 135.7786,
      mapPlacement: "map_anchor",
    },
  ],
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
};

const traceItems = buildMediaSpatialTraceItems(guide);
assert.ok(traceItems.some((item) => item.kind === "place" && /기온/u.test(item.labelKo)));
assert.ok(traceItems.some((item) => item.kind === "time"));
assert.ok(traceItems.some((item) => item.kind === "food"));
assert.ok(traceItems.some((item) => item.kind === "movement"));

const traceCandidates = buildMediaSpatialTraceCandidates({
  event,
  guides: [guide],
  anchorLat: 35.0116,
  anchorLng: 135.7681,
  startRevealOrder: 0,
});
const videoRoot = traceCandidates.find((candidate) => candidate.anchorKind === "video_root");
assert.ok(videoRoot, "video root candidate should exist");
assert.equal(videoRoot?.family, "media");
assert.equal(videoRoot?.markerStyle, "solid");
assert.ok(
  (videoRoot?.spatialTraceItems?.length ?? 0) >= 4,
  "video root should carry spatial trace items",
);

const inferredPlace = traceCandidates.find(
  (candidate) => candidate.anchorKind === "inferred_place" && /기온/u.test(candidate.label),
);
assert.ok(inferredPlace, "inferred place candidate should exist");
assert.equal(inferredPlace?.markerStyle, "dashed");
assert.equal(inferredPlace?.family, "trace_place");
assert.match(inferredPlace?.badgeLabelKo ?? "", /AI 추정/u);
assert.equal(inferredPlace?.validityLabelKo, "영상에서 확인된 후보");

const manifest: SituationProjectionManifest = {
  version: 2,
  manifestId: "sp-spatial-trace",
  situationType: "travel",
  anchorEventId: event.id,
  trigger: { source: "manual", atIso: "2026-07-04T00:00:00.000Z" },
  surfaceKind: "mind_map",
  nodes: [
    {
      kind: "solid",
      id: `solid:${event.id}`,
      eventId: event.id,
      label: event.title,
      evidenceEventIds: [event.id],
      semanticType: "experience",
      semanticTypeLabelKo: "주맥락",
      ontologyRole: "root",
    },
    {
      kind: "ghost",
      id: "ghost:media:kyoto-night-walk:gion",
      axisId: "place",
      label: "기온 거리",
      virtual: true,
      inferred: true,
      lat: 35.0037,
      lng: 135.7788,
      surfacePlacement: "map_anchor",
      semanticType: "place",
      semanticTypeLabelKo: "갈 곳",
      ontologyRole: "projected",
      relationLabelKo: "미디어 후보",
      relationReasonKo: "영상 후보",
      candidateOrigin: "media_inferred",
      candidateConfidence: 0.92,
      sourceGuideNodeId: guide.guideNodeId,
      sourceGuideTitle: guide.title,
      sourceGuideUrl: guide.openUrl,
    },
  ],
  links: [],
  pills: [],
  composedAt: "2026-07-04T00:00:00.000Z",
  readOnly: true,
  layoutSource: "deterministic",
  travelBrain: null,
};

const batch = projectBrainSurfaceBatch({ event, manifest, guides: [guide] });
assert.ok(batch, "batch should exist");
assert.ok(
  batch?.candidates.some((candidate) => candidate.anchorKind === "video_root"),
  "batch should include video root from guide",
);
assert.ok(
  batch?.candidates.some(
    (candidate) =>
      candidate.anchorKind === "inferred_place" && candidate.family === "trace_place",
  ),
  "batch should include dashed inferred place nodes",
);
const duplicateInferred = batch?.candidates.filter(
  (candidate) => candidate.anchorKind === "inferred_place" && /기온/u.test(candidate.label),
);
assert.equal(
  duplicateInferred?.length,
  1,
  "manifest media_inferred ghosts should dedupe against guide spatial trace candidates",
);

console.log("test-media-spatial-trace: ok");
