import type { RimvioEntityId } from "@/lib/ontology/entity-types";

export type MediaGuideCountryBias = "kr" | "jp" | "global";
export type MediaGuideProviderBias = "naver_local" | "google_places" | "global";

export const MEDIA_GUIDE_SOURCE_KINDS = ["youtube", "public_page"] as const;

export type MediaGuideSourceKind = (typeof MEDIA_GUIDE_SOURCE_KINDS)[number];

export const MEDIA_GUIDE_TRUST_LEVELS = [
  "official",
  "guide",
  "video",
  "public",
] as const;

export type MediaGuideTrustLevel = (typeof MEDIA_GUIDE_TRUST_LEVELS)[number];

export type MediaGuideNodeId = `guide:${string}`;

export type MediaGuideMoment = {
  seconds: number;
  timeLabel: string;
  title: string | null;
  chipLabelKo: string;
};

export const MEDIA_GUIDE_CANDIDATE_SOURCES = [
  "title",
  "description",
  "chapter",
  "subtitle",
  "transcript",
] as const;

export type MediaGuideCandidateSource = (typeof MEDIA_GUIDE_CANDIDATE_SOURCES)[number];

export type MediaGuideCandidateSearchProfile = {
  query: string;
  areaLabel: string | null;
  countryBias: MediaGuideCountryBias;
  providerBias: MediaGuideProviderBias;
  searchLocale: string;
  anchorLabel: string;
  anchorLat: number;
  anchorLng: number;
};

export type MediaGuidePlaceCandidate = {
  candidateId: string;
  label: string;
  semanticType: "place" | "eatery" | "lodging" | "info";
  semanticTypeLabelKo: string;
  source: MediaGuideCandidateSource;
  sourceLabelKo: string;
  snippetKo: string;
  whyCandidateKo: string;
  areaLabel: string | null;
  cuisineHint: string | null;
  situationalHintsKo: readonly string[];
  confidence: number;
  searchProfile: MediaGuideCandidateSearchProfile;
  lat: number | null;
  lng: number | null;
  mapPlacement: "map_anchor" | "root_branch";
};

export type MediaGuideYouTubeThumbnailSet = {
  default: string | null;
  medium: string | null;
  high: string | null;
  standard: string | null;
  maxres: string | null;
};

export type MediaGuideYouTubeSearchResult = {
  videoId: string;
  canonicalUrl: string;
  title: string | null;
  description: string | null;
  channelId: string | null;
  channelTitle: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  thumbnails: MediaGuideYouTubeThumbnailSet;
};

export type MediaGuideYouTubeOfficial = {
  apiKeySource: string;
  videoId: string;
  channelId: string | null;
  channelTitle: string | null;
  channelUrl: string | null;
  publishedAt: string | null;
  liveBroadcastContent: string | null;
  viewCount?: number | null;
  tags: readonly string[];
  thumbnails: MediaGuideYouTubeThumbnailSet;
  relatedSearchResults: readonly MediaGuideYouTubeSearchResult[];
};

/**
 * External media / guide evidence attached to an existing Rimvio context/place.
 * These nodes are assistive context, never the source of place identity truth.
 */
export type MediaGuideNode = {
  guideNodeId: MediaGuideNodeId;
  title: string;
  sourceKind: MediaGuideSourceKind;
  sourceLabelKo: string;
  trustLevel: MediaGuideTrustLevel;
  trustLabelKo: string;
  canonicalUrl: string;
  openUrl: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  providerName: string | null;
  domain: string;
  durationSeconds: number | null;
  youtubeOfficial?: MediaGuideYouTubeOfficial | null;
  moments: readonly MediaGuideMoment[];
  primaryMoment: MediaGuideMoment | null;
  relatedExperienceEntityId: RimvioEntityId;
  relatedPlaceEntityId: RimvioEntityId | null;
  relatedPlaceLabel: string | null;
  relatedCaptureId: string | null;
  whyRelevantKo: string;
  relevanceScore: number;
  inferredPlaceCandidates: readonly MediaGuidePlaceCandidate[];
  createdAt: string;
  updatedAt: string;
};

export const MEDIA_GUIDE_SNAPSHOT_VERSION = 2 as const;

export type MediaGuideSnapshot = {
  version: typeof MEDIA_GUIDE_SNAPSHOT_VERSION;
  guides: readonly MediaGuideNode[];
  updatedAt: string;
};

export const EMPTY_MEDIA_GUIDE_SNAPSHOT: MediaGuideSnapshot = {
  version: MEDIA_GUIDE_SNAPSHOT_VERSION,
  guides: [],
  updatedAt: new Date(0).toISOString(),
};
