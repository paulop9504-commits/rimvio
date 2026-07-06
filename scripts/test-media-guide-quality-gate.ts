#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { asRimvioEntityId } from "../lib/ontology/entity-types";
import {
  filterTrustedMediaGuides,
  meetsTrustedYoutubeViewGate,
  MIN_TRUSTED_YOUTUBE_VIEW_COUNT,
} from "../lib/ontology/media-guide-quality-gate";
import type { MediaGuideNode } from "../lib/ontology/media-guide-types";

function youtubeGuide(viewCount: number | null): MediaGuideNode {
  return {
    guideNodeId: "guide:test",
    title: "테스트 영상",
    sourceKind: "youtube",
    sourceLabelKo: "YouTube",
    trustLevel: "video",
    trustLabelKo: "영상",
    canonicalUrl: "https://www.youtube.com/watch?v=test",
    openUrl: "https://www.youtube.com/watch?v=test",
    embedUrl: "https://www.youtube.com/embed/test",
    thumbnailUrl: null,
    description: null,
    providerName: null,
    domain: "youtube.com",
    durationSeconds: 600,
    youtubeOfficial: viewCount == null ? null : {
      apiKeySource: "YOUTUBE_DATA_API_KEY",
      videoId: "test",
      channelId: null,
      channelTitle: null,
      channelUrl: null,
      publishedAt: null,
      liveBroadcastContent: null,
      viewCount,
      tags: [],
      thumbnails: {
        default: null,
        medium: null,
        high: null,
        standard: null,
        maxres: null,
      },
      relatedSearchResults: [],
    },
    moments: [],
    primaryMoment: null,
    relatedExperienceEntityId: asRimvioEntityId("experience", "ev-1"),
    relatedPlaceEntityId: null,
    relatedPlaceLabel: null,
    relatedCaptureId: null,
    whyRelevantKo: "테스트",
    relevanceScore: 70,
    inferredPlaceCandidates: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

assert.equal(MIN_TRUSTED_YOUTUBE_VIEW_COUNT, 300_000);
assert.equal(meetsTrustedYoutubeViewGate(299_999), false);
assert.equal(meetsTrustedYoutubeViewGate(300_000), true);
assert.equal(meetsTrustedYoutubeViewGate(null), true);
assert.equal(meetsTrustedYoutubeViewGate(null, { requireKnown: true }), false);

const trusted = filterTrustedMediaGuides([
  youtubeGuide(500_000),
  youtubeGuide(12_000),
]);
assert.equal(trusted.length, 1);
assert.equal(trusted[0]?.youtubeOfficial?.viewCount, 500_000);

console.log("test-media-guide-quality-gate: ok");
