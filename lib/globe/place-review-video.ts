import { inferMapRegionBias, type MapRegionBias } from "@/lib/ontology/infer-map-region-bias";
import {
  fetchYouTubeVideoQualityByIds,
  searchYouTubeVideos,
} from "@/lib/media/youtube-data-api";

/** A short video node linked to a pinned place (꼬리에 꼬리 물기 — place → video). */
export type PlaceReviewVideo = {
  videoId: string;
  title: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  embedUrl: string;
  watchUrl: string;
};

export type PlaceReviewVideoResult = {
  /** Real embeddable videos when the YouTube Data API is configured + matches exist. */
  videos: PlaceReviewVideo[];
  /** Always-usable deep link to YouTube results (mock / no-key fallback). */
  searchUrl: string;
};

export type PlaceReviewKind = "lodging" | "eatery" | "place";

const MAX_REVIEW_VIDEOS = 3;

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function reviewKeyword(kind: PlaceReviewKind, region: MapRegionBias): string {
  if (region === "jp") {
    if (kind === "lodging") {
      return "ホテル ルームツアー";
    }
    if (kind === "eatery") {
      return "グルメ レビュー";
    }
    return "レビュー";
  }
  if (kind === "lodging") {
    return "호텔 룸투어 후기";
  }
  if (kind === "eatery") {
    return "맛집 후기 브이로그";
  }
  return "후기";
}

function buildReviewSearchQuery(input: {
  name: string;
  place: string | null;
  kind: PlaceReviewKind;
  region: MapRegionBias;
}): string {
  const name = normalizeText(input.name);
  const place = normalizeText(input.place);
  const base = [name, place].filter(Boolean).join(" ");
  return `${base} ${reviewKeyword(input.kind, input.region)}`.trim();
}

function buildYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function regionCode(region: MapRegionBias): string | null {
  if (region === "jp") {
    return "JP";
  }
  if (region === "kr") {
    return "KR";
  }
  return null;
}

function relevanceLanguage(region: MapRegionBias): string | null {
  return region === "jp" ? "ja" : "ko";
}

/** Server-side: resolve top embeddable review/tour videos linked to a pinned place. */
export async function resolvePlaceReviewVideos(input: {
  name: string;
  place?: string | null;
  kind?: PlaceReviewKind;
  lat?: number | null;
  lng?: number | null;
}): Promise<PlaceReviewVideoResult> {
  const kind = input.kind ?? "place";
  const region = inferMapRegionBias({
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    areaLabel: input.place ?? input.name,
  });
  const query = buildReviewSearchQuery({
    name: input.name,
    place: input.place ?? null,
    kind,
    region,
  });
  const searchUrl = buildYouTubeSearchUrl(query);

  const results = await searchYouTubeVideos({
    query,
    regionCode: regionCode(region),
    relevanceLanguage: relevanceLanguage(region),
    maxResults: 10,
  });
  if (results.length === 0) {
    return { videos: [], searchUrl };
  }

  const quality = await fetchYouTubeVideoQualityByIds(
    results.map((row) => row.videoId),
  );
  const videos: PlaceReviewVideo[] = results
    .filter((row) => quality.get(row.videoId)?.embeddable)
    .slice(0, MAX_REVIEW_VIDEOS)
    .map((row) => ({
      videoId: row.videoId,
      title: normalizeText(row.title) || null,
      channelTitle: normalizeText(row.channelTitle) || null,
      thumbnailUrl: row.thumbnailUrl ?? null,
      embedUrl: `https://www.youtube-nocookie.com/embed/${row.videoId}`,
      watchUrl: row.canonicalUrl,
    }));

  return { videos, searchUrl };
}
