import assert from "node:assert/strict";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import {
  countExpandableMediaGuideCandidates,
  mediaGuideHasMapCandidates,
  pickPrimaryExpandableMediaGuide,
} from "../lib/globe/expand-media-guide-on-map";

function guide(partial: Partial<MediaGuideNode> & Pick<MediaGuideNode, "guideNodeId">): MediaGuideNode {
  return {
    guideNodeId: partial.guideNodeId,
    title: partial.title ?? "도쿄 맛집 브이로그",
    sourceKind: "youtube",
    sourceLabelKo: "YouTube",
    trustLevel: "video",
    trustLabelKo: "영상",
    canonicalUrl: "https://youtube.com/watch?v=test",
    openUrl: "https://youtube.com/watch?v=test",
    embedUrl: null,
    thumbnailUrl: null,
    description: null,
    providerName: null,
    domain: "youtube.com",
    durationSeconds: 600,
    moments: [],
    primaryMoment: null,
    relatedExperienceEntityId: "experience:test",
    relatedPlaceEntityId: null,
    relatedPlaceLabel: "도쿄",
    relatedCaptureId: null,
    whyRelevantKo: "도쿄 맛집 흐름",
    relevanceScore: partial.relevanceScore ?? 0.8,
    inferredPlaceCandidates: partial.inferredPlaceCandidates ?? [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

const withCandidates = guide({
  guideNodeId: "guide:tokyo",
  relevanceScore: 0.92,
  inferredPlaceCandidates: [
    {
      candidateId: "c1",
      label: "신주uku",
      semanticType: "eatery",
      semanticTypeLabelKo: "맛집",
      source: "title",
      sourceLabelKo: "제목",
      snippetKo: "신주uku 라멘",
      whyCandidateKo: "제목에 등장",
      areaLabel: "도쿄",
      cuisineHint: "라멘",
      situationalHintsKo: [],
      confidence: 0.87,
      searchProfile: {
        query: "신주uku 라멘",
        areaLabel: "도쿄",
        countryBias: "JP",
        providerBias: "google",
        searchLocale: "ko",
        anchorLabel: "도쿄",
        anchorLat: 35.68,
        anchorLng: 139.76,
      },
      lat: 35.69,
      lng: 139.77,
      mapPlacement: "map_anchor",
    },
  ],
});

const emptyGuide = guide({ guideNodeId: "guide:empty", relevanceScore: 0.99 });

assert.equal(mediaGuideHasMapCandidates(withCandidates), true);
assert.equal(mediaGuideHasMapCandidates(emptyGuide), false);
assert.equal(pickPrimaryExpandableMediaGuide([emptyGuide, withCandidates])?.guideNodeId, "guide:tokyo");
assert.equal(countExpandableMediaGuideCandidates([withCandidates, emptyGuide]), 1);

console.log("test-expand-media-guide-on-map: ok");
