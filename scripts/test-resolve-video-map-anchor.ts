#!/usr/bin/env npx tsx
/**
 * Video about Osaka must play at Osaka — never Seoul GPS hub.
 */

import assert from "node:assert/strict";
import {
  pickVideoPlaybackCoords,
  resolveVideoMapAnchor,
} from "../lib/globe/resolve-video-map-anchor";
import { resolveBrainSurfaceSpatialTraceRoot } from "../lib/globe/brain-surface-spatial-trace";
import { buildMediaSpatialTraceCandidates } from "../lib/situation-projection/build-media-spatial-trace";
import type { BrainSurfaceProjectionCandidate } from "../lib/situation-projection/brain-surface-types";
import type { MediaGuideNode } from "../lib/ontology/media-guide-types";
import type { EventCandidate } from "../lib/events/event-candidate";
import { asRimvioEntityId } from "../lib/ontology/entity-types";

const OSAKA_LAT = 34.6937;
const OSAKA_LNG = 135.5023;
const SEOUL_LAT = 37.5665;
const SEOUL_LNG = 126.978;

{
  const anchor = resolveVideoMapAnchor({
    title: "오사카 2박3일",
    placeLabel: "오사카",
    lat: SEOUL_LAT,
    lng: SEOUL_LNG,
  });
  assert.ok(anchor);
  assert.ok(Math.abs(anchor!.lat - OSAKA_LAT) < 0.5);
  assert.ok(Math.abs(anchor!.lng - OSAKA_LNG) < 0.5);
  assert.notEqual(anchor!.source, "fallback_coords");
}

{
  const playback = pickVideoPlaybackCoords({
    videoLat: OSAKA_LAT,
    videoLng: OSAKA_LNG,
    hubLat: SEOUL_LAT,
    hubLng: SEOUL_LNG,
  });
  assert.equal(playback.usedHub, false);
  assert.ok(Math.abs(playback.lat - OSAKA_LAT) < 0.01);
}

{
  const nearHub = pickVideoPlaybackCoords({
    videoLat: OSAKA_LAT,
    videoLng: OSAKA_LNG,
    hubLat: OSAKA_LAT + 0.01,
    hubLng: OSAKA_LNG + 0.01,
  });
  assert.equal(nearHub.usedHub, true);
}

{
  const root: BrainSurfaceProjectionCandidate = {
    id: "video",
    eventId: "evt-osaka",
    nodeId: null,
    family: "media",
    clusterId: "media:g1",
    focusAffinityFamilies: [],
    label: "오사카 2박3일",
    previewTitle: "오사카 2박3일",
    previewBody: null,
    placeLabel: "오사카",
    lat: OSAKA_LAT,
    lng: OSAKA_LNG,
    accent: "purple",
    badgeLabelKo: "영상",
    relationMemoKo: null,
    sourceLabelKo: null,
    validityLabelKo: null,
    evidenceKind: "video",
    primaryActionLabelKo: null,
    openUrl: null,
    embedUrl: "https://www.youtube.com/embed/x",
    mapsUrl: null,
    searchQuery: null,
    sourceGuideNodeId: "g1",
    revealOrder: 0,
    virtualCandidate: true,
    memoCommitDraft: null,
    anchorKind: "video_root",
  };
  const snapped = resolveBrainSurfaceSpatialTraceRoot({
    root,
    hubLat: SEOUL_LAT,
    hubLng: SEOUL_LNG,
  });
  assert.ok(Math.abs(snapped.lat - OSAKA_LAT) < 0.01, "must not snap Osaka video to Seoul");
  assert.ok(Math.abs(snapped.lng - OSAKA_LNG) < 0.01);
}

{
  const event: EventCandidate = {
    id: "evt-osaka-trace",
    title: "오사카 여행",
    category: "travel",
    source: "message",
    lifecycle: "active",
    place: "오사카",
    confidence: 0.9,
    metadata: {},
    lifecycleUpdatedAt: "2026-07-17T00:00:00.000Z",
    createdAt: "2026-07-17T00:00:00.000Z",
    updatedAt: "2026-07-17T00:00:00.000Z",
  };
  const guide: MediaGuideNode = {
    guideNodeId: "guide:osaka-vlog",
    title: "오사카 2박3일",
    sourceKind: "youtube",
    sourceLabelKo: "YouTube",
    trustLevel: "video",
    trustLabelKo: "영상",
    canonicalUrl: "https://www.youtube.com/watch?v=osaka",
    openUrl: "https://www.youtube.com/watch?v=osaka",
    embedUrl: "https://www.youtube.com/embed/osaka",
    thumbnailUrl: null,
    description: "오사카 여행 브이로그",
    providerName: "Travel",
    domain: "youtube.com",
    durationSeconds: 600,
    youtubeOfficial: null,
    moments: [],
    primaryMoment: null,
    relatedExperienceEntityId: asRimvioEntityId("experience", event.id),
    relatedPlaceEntityId: null,
    relatedPlaceLabel: "오사카",
    relatedCaptureId: null,
    whyRelevantKo: "여행 브리핑",
    relevanceScore: 0.9,
    inferredPlaceCandidates: [],
    createdAt: "2026-07-17T00:00:00.000Z",
    updatedAt: "2026-07-17T00:00:00.000Z",
  };

  // Even if event orbit is wrongly Seoul, video_root must land in Osaka.
  const candidates = buildMediaSpatialTraceCandidates({
    event,
    guides: [guide],
    anchorLat: SEOUL_LAT,
    anchorLng: SEOUL_LNG,
    startRevealOrder: 0,
  });
  const videoRoot = candidates.find((row) => row.anchorKind === "video_root");
  assert.ok(videoRoot);
  assert.ok(Math.abs(videoRoot!.lat - OSAKA_LAT) < 0.5);
  assert.ok(Math.abs(videoRoot!.lng - OSAKA_LNG) < 0.5);
}

console.log("test-resolve-video-map-anchor: ok");
