#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetMediaGuideStoreForTests, writeMediaGuideSnapshot } from "../lib/ontology/media-guide-store";
import type { MediaGuideNode } from "../lib/ontology/media-guide-types";
import { asRimvioEntityId } from "../lib/ontology/entity-types";
import type { EventCandidate } from "../lib/events/event-candidate";
import { projectBrainSurfaceBatch } from "../lib/situation-projection/project-brain-surface-batch";
import type { SituationProjectionManifest } from "../lib/situation-projection/types";

resetMediaGuideStoreForTests();

const event: EventCandidate = {
  id: "ev-brain-surface",
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
  guideNodeId: "guide:kyoto-night",
  title: "교토 밤 산책 영상",
  sourceKind: "youtube",
  sourceLabelKo: "영상",
  trustLevel: "video",
  trustLabelKo: "영상",
  canonicalUrl: "https://www.youtube.com/watch?v=abc123",
  openUrl: "https://www.youtube.com/watch?v=abc123",
  embedUrl: "https://www.youtube.com/embed/abc123",
  thumbnailUrl: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
  description: "교토 밤 동선",
  providerName: "Kyoto Walk",
  domain: "youtube.com",
  durationSeconds: 540,
  youtubeOfficial: null,
  moments: [],
  primaryMoment: null,
  relatedExperienceEntityId: asRimvioEntityId("experience", event.id),
  relatedPlaceEntityId: null,
  relatedPlaceLabel: "교토",
  relatedCaptureId: "cap-1",
  whyRelevantKo: "밤 동선과 식사 흐름을 바로 볼 수 있어요",
  relevanceScore: 0.94,
  inferredPlaceCandidates: [],
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
};

writeMediaGuideSnapshot({
  version: 1,
  guides: [guide],
  updatedAt: "2026-07-04T00:00:00.000Z",
});

const manifest: SituationProjectionManifest = {
  version: 2,
  manifestId: "sp-1",
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
      id: "ghost:media:kyoto-night",
      axisId: "place",
      label: "기온 거리",
      virtual: true,
      inferred: true,
      lat: 35.0037,
      lng: 135.7788,
      surfacePlacement: "map_anchor",
      semanticType: "place",
      semanticTypeLabelKo: "플레이",
      ontologyRole: "projected",
      relationLabelKo: "갈 곳 축",
      relationReasonKo: "밤에 걷기 좋은 곳",
      candidateOrigin: "media_inferred",
      sourceGuideNodeId: guide.guideNodeId,
      sourceGuideTitle: guide.title,
      sourceGuideUrl: guide.openUrl,
      sourceGuideSnippetKo: "기온 거리에서 밤 산책",
      situationalHintsKo: ["늦은 시간"],
    },
    {
      kind: "ghost",
      id: "ghost:eatery:ramen",
      axisId: "eatery",
      label: "교토 라멘 골목",
      virtual: true,
      inferred: true,
      lat: 35.0021,
      lng: 135.7595,
      surfacePlacement: "map_anchor",
      semanticType: "eatery",
      semanticTypeLabelKo: "맛집",
      ontologyRole: "projected",
      relationLabelKo: "식사 동선",
      relationReasonKo: "늦게 가도 한 끼가 이어져요",
      searchQuery: "교토 라멘 골목",
      mapsUrl: "https://maps.example/ramen",
    },
    {
      kind: "ghost",
      id: "ghost:lodging:stay",
      axisId: "lodging",
      label: "가와라마치 스테이",
      virtual: true,
      inferred: true,
      lat: 35.001,
      lng: 135.767,
      surfacePlacement: "map_anchor",
      semanticType: "lodging",
      semanticTypeLabelKo: "숙소",
      ontologyRole: "projected",
      relationLabelKo: "머무는 축",
      relationReasonKo: "늦게 들어와도 부담이 적어요",
      searchQuery: "교토 가와라마치 숙소",
    },
  ],
  links: [],
  pills: [],
  composedAt: "2026-07-04T00:00:00.000Z",
  readOnly: true,
  layoutSource: "deterministic",
  travelBrain: null,
};

const batch = projectBrainSurfaceBatch({ event, manifest });
assert.ok(batch, "brain surface batch should exist for map-anchor ghosts");
assert.equal(batch?.eventId, event.id);
assert.ok(
  batch?.candidates.some((candidate) => candidate.family === "trace_place"),
  "media-inferred place should project as trace_place family",
);
assert.ok(
  batch?.candidates.some((candidate) => candidate.family === "eatery"),
  "eatery candidate should project onto the surface",
);
assert.ok(
  batch?.candidates.some((candidate) => candidate.family === "lodging"),
  "lodging candidate should project onto the surface",
);
const memoCandidate = batch?.candidates.find((candidate) => candidate.family === "memo") ?? null;
assert.ok(memoCandidate, "memo label candidate should be synthesized");
assert.ok(memoCandidate?.memoCommitDraft, "memo candidate should carry explicit commit payload");
assert.equal(
  batch?.candidates.every((candidate, index) => candidate.revealOrder === index),
  true,
  "surface candidates should keep deterministic reveal ordering",
);

console.log("test-brain-surface-batch: ok");
