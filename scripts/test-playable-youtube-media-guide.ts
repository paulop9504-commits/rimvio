#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  filterPlayableMediaGuides,
  isPlayableYoutubeMediaGuide,
} from "../lib/ontology/playable-youtube-media-guide";
import type { MediaGuideNode } from "../lib/ontology/media-guide-types";

function guide(partial: Partial<MediaGuideNode> & Pick<MediaGuideNode, "guideNodeId">): MediaGuideNode {
  return {
    guideNodeId: partial.guideNodeId,
    title: partial.title ?? "도쿄 여행",
    sourceKind: partial.sourceKind ?? "youtube",
    sourceLabelKo: "YouTube",
    trustLevel: "video",
    trustLabelKo: "영상",
    canonicalUrl: partial.canonicalUrl ?? "https://youtube.com/watch?v=test",
    openUrl: partial.openUrl ?? "https://youtube.com/watch?v=test",
    embedUrl: partial.embedUrl ?? null,
    thumbnailUrl: null,
    description: null,
    providerName: null,
    domain: "youtube.com",
    durationSeconds: null,
    youtubeOfficial: null,
    moments: [],
    primaryMoment: null,
    relatedExperienceEntityId: "experience:evt" as MediaGuideNode["relatedExperienceEntityId"],
    relatedPlaceEntityId: null,
    relatedPlaceLabel: "도쿄",
    relatedCaptureId: null,
    whyRelevantKo: "test",
    relevanceScore: 50,
    inferredPlaceCandidates: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

assert.equal(
  isPlayableYoutubeMediaGuide(
    guide({ guideNodeId: "guide:1", embedUrl: "https://youtube.com/embed/ok" }),
  ),
  true,
);
assert.equal(
  isPlayableYoutubeMediaGuide(guide({ guideNodeId: "guide:2", embedUrl: null })),
  false,
);
assert.equal(
  isPlayableYoutubeMediaGuide(
    guide({ guideNodeId: "guide:3", sourceKind: "public_page", embedUrl: null }),
  ),
  true,
);

const filtered = filterPlayableMediaGuides([
  guide({ guideNodeId: "guide:1", embedUrl: "https://youtube.com/embed/ok" }),
  guide({ guideNodeId: "guide:2", embedUrl: null }),
]);
assert.equal(filtered.length, 1);
assert.equal(filtered[0]?.guideNodeId, "guide:1");

console.log("test-playable-youtube-media-guide: ok");
