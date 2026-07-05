import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/events/read-feed-capture-fragments";
import { inferMapRegionBias } from "@/lib/globe/infer-area-curiosity-hook";
import { isYouTubeDomain } from "@/lib/enrichers/youtube-url";
import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";
import {
  fetchYouTubeOfficialVideo,
  pickEmbeddableYouTubeVideoIds,
  searchYouTubeVideos,
  type YouTubeOfficialSearchResult,
} from "@/lib/media/youtube-data-api";
import { entityFromPlaceLabel } from "@/lib/ontology/entity-adapters";
import { asRimvioEntityId } from "@/lib/ontology/entity-types";
import { inferMediaGuidePlaceCandidates } from "@/lib/ontology/media-guide-place-inference";
import type {
  MediaGuideNode,
  MediaGuideNodeId,
} from "@/lib/ontology/media-guide-types";
import { classifySituationTypeFromEvent } from "@/lib/situation-projection/classify-situation-type";

const PROACTIVE_YOUTUBE_LIMIT = 3;

const PLACE_SEARCH_ALIASES: Record<string, readonly string[]> = {
  도쿄: ["tokyo", "東京"],
  tokyo: ["도쿄", "東京"],
  東京: ["도쿄", "tokyo"],
  오사카: ["osaka", "大阪"],
  osaka: ["오사카", "大阪"],
  교토: ["kyoto", "京都"],
  kyoto: ["교토", "京都"],
  신주쿠: ["shinjuku", "新宿"],
  shinjuku: ["신주쿠", "新宿"],
  시부야: ["shibuya", "渋谷"],
  shibuya: ["시부야", "渋谷"],
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function normalizeDomain(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, "");
}

function eventHasCapturedYoutube(event: EventCandidate): boolean {
  for (const fragment of readFeedCaptureFragments(event)) {
    const rawUrl = normalizeText(fragment.url);
    if (!rawUrl) {
      continue;
    }
    try {
      const parsed = normalizeInputUrl(rawUrl);
      if (isYouTubeDomain(normalizeDomain(parsed.hostname))) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

function buildYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

function buildProactiveGuideNodeId(eventId: string, videoId: string): MediaGuideNodeId {
  return `guide:${eventId}:proactive-yt:${videoId}` as MediaGuideNodeId;
}

function placeTokens(placeLabel: string): string[] {
  const base = normalizeText(placeLabel);
  if (!base) {
    return [];
  }
  const token = base.toLowerCase();
  const aliases = PLACE_SEARCH_ALIASES[token] ?? PLACE_SEARCH_ALIASES[base] ?? [];
  return [base, token, ...aliases.map((alias) => alias.toLowerCase())];
}

function matchesPlaceInBlob(blob: string, placeLabel: string): boolean {
  const haystack = normalizeText(blob).toLowerCase();
  if (!haystack) {
    return false;
  }
  return placeTokens(placeLabel).some((token) => token && haystack.includes(token.toLowerCase()));
}

export function buildProactiveSearchQuery(placeLabel: string, region: ReturnType<typeof inferMapRegionBias>): string {
  const place = normalizeText(placeLabel);
  if (!place) {
    return region === "jp" ? "일본 여행" : "여행";
  }
  if (region === "jp" && /[가-힣]/u.test(place)) {
    return `${place} 여행`;
  }
  if (region === "jp") {
    return `${place} 旅行`;
  }
  return `${place} 여행`;
}

function resolveYoutubeRegionCode(region: ReturnType<typeof inferMapRegionBias>): string | null {
  if (region === "jp") {
    return "JP";
  }
  if (region === "kr") {
    return "KR";
  }
  return null;
}

function resolveYoutubeRelevanceLanguage(region: ReturnType<typeof inferMapRegionBias>): string | null {
  if (region === "jp") {
    return "ja";
  }
  if (region === "kr") {
    return "ko";
  }
  return "ko";
}

function buildWhyRelevantKo(placeLabel: string, title: string | null): string {
  const place = normalizeText(placeLabel) || "이 여행";
  const cleanTitle = normalizeText(title);
  if (cleanTitle) {
    return `${place} 맥락에 맞춰 찾은 「${cleanTitle}」`;
  }
  return `${place} 감을 빠르게 잡기 좋은 영상이에요`;
}

async function buildGuideFromSearchResult(input: {
  event: EventCandidate;
  result: YouTubeOfficialSearchResult;
  relatedPlaceLabel: string;
  anchorLat: number;
  anchorLng: number;
}): Promise<MediaGuideNode | null> {
  const videoId = normalizeText(input.result.videoId);
  if (!videoId) {
    return null;
  }
  const officialVideo = await fetchYouTubeOfficialVideo({ videoId });
  if (!officialVideo?.embeddable) {
    return null;
  }
  const title = normalizeText(officialVideo?.title ?? input.result.title) || "YouTube";
  const description = normalizeText(officialVideo?.description ?? input.result.description);
  const thumbnailUrl =
    officialVideo?.thumbnailUrl ??
    input.result.thumbnailUrl ??
    null;
  const nowIso = new Date().toISOString();
  const canonicalUrl = input.result.canonicalUrl;
  const relatedPlaceEntityId = entityFromPlaceLabel(input.relatedPlaceLabel).entityId;

  const baseGuide = {
    guideNodeId: buildProactiveGuideNodeId(input.event.id, videoId),
    title,
    sourceKind: "youtube" as const,
    sourceLabelKo: "YouTube",
    trustLevel: "video" as const,
    trustLabelKo: "영상",
    canonicalUrl,
    openUrl: canonicalUrl,
    embedUrl: buildYouTubeEmbedUrl(videoId),
    thumbnailUrl,
    description,
    providerName: normalizeText(officialVideo?.channelTitle ?? input.result.channelTitle),
    domain: "youtube.com",
    durationSeconds: officialVideo?.durationSeconds ?? null,
    youtubeOfficial: officialVideo
      ? {
          apiKeySource: "YOUTUBE_DATA_API_KEY",
          videoId: officialVideo.videoId,
          channelId: officialVideo.channelId,
          channelTitle: officialVideo.channelTitle,
          channelUrl: officialVideo.channelId
            ? `https://www.youtube.com/channel/${officialVideo.channelId}`
            : null,
          publishedAt: officialVideo.publishedAt,
          liveBroadcastContent: officialVideo.liveBroadcastContent,
          tags: officialVideo.tags,
          thumbnails: officialVideo.thumbnails,
          relatedSearchResults: [],
        }
      : null,
    moments: [],
    primaryMoment: null,
    relatedExperienceEntityId: asRimvioEntityId("experience", input.event.id),
    relatedPlaceEntityId,
    relatedPlaceLabel: input.relatedPlaceLabel,
    relatedCaptureId: null,
    whyRelevantKo: buildWhyRelevantKo(input.relatedPlaceLabel, title),
    relevanceScore: matchesPlaceInBlob(`${title} ${description}`, input.relatedPlaceLabel) ? 78 : 68,
  };

  const inferredPlaceCandidates = inferMediaGuidePlaceCandidates({
    event: input.event,
    guide: baseGuide,
    capturePlaceLabel: input.relatedPlaceLabel,
    mediaTextSignals: [],
  });

  return {
    ...baseGuide,
    inferredPlaceCandidates,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/** Travel place context — fetch related YouTube guides when user has not shared a video yet. */
export async function discoverProactiveTravelYoutubeGuides(
  event: EventCandidate,
): Promise<MediaGuideNode[]> {
  if (classifySituationTypeFromEvent(event) !== "travel") {
    return [];
  }
  if (eventHasCapturedYoutube(event)) {
    return [];
  }

  const context = buildContextInstance({ event });
  const relatedPlaceLabel =
    normalizeText(context.location.areaLabel) ||
    normalizeText(context.location.anchor.profile.label) ||
    normalizeText(event.place) ||
    normalizeText(event.title) ||
    null;
  if (!relatedPlaceLabel) {
    return [];
  }

  const anchorLat = context.location.anchor.profile.lat;
  const anchorLng = context.location.anchor.profile.lng;
  if (anchorLat == null || anchorLng == null) {
    return [];
  }

  const region = inferMapRegionBias({
    lat: anchorLat,
    lng: anchorLng,
    areaLabel: relatedPlaceLabel,
  });
  const query = buildProactiveSearchQuery(relatedPlaceLabel, region);
  const results = await searchYouTubeVideos({
    query,
    regionCode: resolveYoutubeRegionCode(region),
    relevanceLanguage: resolveYoutubeRelevanceLanguage(region),
    maxResults: 12,
  });

  const embeddableIds = await pickEmbeddableYouTubeVideoIds(
    results.map((result) => result.videoId),
  );
  const embeddableResults = results.filter((result) =>
    embeddableIds.has(result.videoId),
  );

  const filtered = embeddableResults.filter((result) =>
    matchesPlaceInBlob(
      `${result.title ?? ""} ${result.description ?? ""}`,
      relatedPlaceLabel,
    ),
  );

  const picked = (filtered.length > 0 ? filtered : embeddableResults).slice(
    0,
    PROACTIVE_YOUTUBE_LIMIT,
  );
  const guides = await Promise.all(
    picked.map((result) =>
      buildGuideFromSearchResult({
        event,
        result,
        relatedPlaceLabel,
        anchorLat,
        anchorLng,
      }),
    ),
  );

  return guides.filter((guide): guide is MediaGuideNode => guide != null);
}
