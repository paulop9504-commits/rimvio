import {
  buildReviewSearchQuery,
  resolvePlaceReviewQueryLang,
} from "@/lib/globe/place-review-video";
import { buildLodgingYouTubeEmbedUrl } from "@/lib/globe/lodging/build-lodging-youtube-embed-url";
import { computeLodgingYouTubeConfidence } from "@/lib/globe/lodging/compute-lodging-youtube-confidence";
import {
  LODGING_YOUTUBE_CONFIDENCE_GATE,
  type LodgingYouTubePreview,
} from "@/lib/globe/lodging/lodging-youtube-preview-types";
import { inferMapRegionBias } from "@/lib/ontology/infer-map-region-bias";
import {
  fetchYouTubeVideoPlaybackByIds,
  isYouTubeDataApiConfigured,
  searchYouTubeVideos,
  type YouTubeOfficialSearchResult,
} from "@/lib/media/youtube-data-api";
import type { AppLocale } from "@/lib/i18n/types";

const SEARCH_POOL = 15;

function regionCodeForAudience(queryLang: "ko" | "ja" | "en"): string | null {
  if (queryLang === "ko") {
    return "KR";
  }
  if (queryLang === "ja") {
    return "JP";
  }
  return null;
}

function relevanceLanguage(queryLang: "ko" | "ja" | "en"): string | null {
  return queryLang === "en" ? "en" : queryLang;
}

function shortsQuery(base: string): string {
  return `${base} #shorts`.trim();
}

type ScoredCandidate = {
  row: YouTubeOfficialSearchResult;
  confidence: number;
  durationSeconds: number | null;
  isShort: boolean;
};

function rankCandidates(candidates: readonly ScoredCandidate[]): ScoredCandidate | null {
  if (candidates.length === 0) {
    return null;
  }
  const sorted = [...candidates].sort((a, b) => {
    if (a.isShort !== b.isShort) {
      return a.isShort ? -1 : 1;
    }
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    const aDuration = a.durationSeconds ?? Number.POSITIVE_INFINITY;
    const bDuration = b.durationSeconds ?? Number.POSITIVE_INFINITY;
    return aDuration - bDuration;
  });
  return sorted[0] ?? null;
}

/** Server — gated Shorts / short embed for lodging hero (≥95% name match). */
export async function resolveLodgingYouTubePreview(input: {
  name: string;
  place?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  audienceLocale?: AppLocale | string | null;
}): Promise<LodgingYouTubePreview | null> {
  if (!isYouTubeDataApiConfigured()) {
    return null;
  }

  const mapRegion = inferMapRegionBias({
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    areaLabel: input.place ?? input.name,
  });
  const queryLang = resolvePlaceReviewQueryLang({
    audienceLocale: input.audienceLocale,
    mapRegion,
  });
  const baseQuery = buildReviewSearchQuery({
    name: input.name,
    place: input.place ?? null,
    kind: "lodging",
    queryLang,
  });

  const [shortsResults, tourResults] = await Promise.all([
    searchYouTubeVideos({
      query: shortsQuery(baseQuery),
      regionCode: regionCodeForAudience(queryLang),
      relevanceLanguage: relevanceLanguage(queryLang),
      maxResults: SEARCH_POOL,
    }),
    searchYouTubeVideos({
      query: baseQuery,
      regionCode: regionCodeForAudience(queryLang),
      relevanceLanguage: relevanceLanguage(queryLang),
      maxResults: SEARCH_POOL,
    }),
  ]);

  const merged = new Map<string, YouTubeOfficialSearchResult>();
  for (const row of [...shortsResults, ...tourResults]) {
    merged.set(row.videoId, row);
  }
  if (merged.size === 0) {
    return null;
  }

  const playback = await fetchYouTubeVideoPlaybackByIds([...merged.keys()]);
  const scored: ScoredCandidate[] = [];

  for (const row of merged.values()) {
    const meta = playback.get(row.videoId);
    if (!meta?.embeddable) {
      continue;
    }
    const confidence = computeLodgingYouTubeConfidence({
      placeName: input.name,
      address: input.address ?? null,
      title: meta.title ?? row.title,
      description: meta.description ?? row.description,
      channelTitle: meta.channelTitle ?? row.channelTitle,
    });
    if (confidence < LODGING_YOUTUBE_CONFIDENCE_GATE) {
      continue;
    }
    const durationSeconds = meta.durationSeconds;
    scored.push({
      row,
      confidence,
      durationSeconds,
      isShort: durationSeconds != null && durationSeconds > 0 && durationSeconds <= 60,
    });
  }

  const winner = rankCandidates(scored);
  if (!winner) {
    return null;
  }

  const meta = playback.get(winner.row.videoId);
  const embed = buildLodgingYouTubeEmbedUrl({
    videoId: winner.row.videoId,
    durationSeconds: winner.durationSeconds,
  });

  return {
    videoId: winner.row.videoId,
    title: meta?.title ?? winner.row.title ?? null,
    embedUrl: embed.embedUrl,
    watchUrl: winner.row.canonicalUrl,
    thumbnailUrl: meta?.thumbnailUrl ?? winner.row.thumbnailUrl ?? null,
    confidence: winner.confidence,
    isShort: embed.isShort,
    startSec: embed.startSec,
    endSec: embed.endSec,
    durationSeconds: winner.durationSeconds,
  };
}
