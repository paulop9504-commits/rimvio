import { inferMapRegionBias, type MapRegionBias } from "@/lib/ontology/infer-map-region-bias";
import {
  fetchYouTubeVideoQualityByIds,
  searchYouTubeVideos,
  type YouTubeOfficialSearchResult,
} from "@/lib/media/youtube-data-api";
import type { AppLocale } from "@/lib/i18n/types";

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
const SEARCH_POOL = 12;

const HANGUL_RE = /[\uAC00-\uD7A3]/u;
const KANA_RE = /[\u3040-\u30FF]/u;

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function reviewKeyword(kind: PlaceReviewKind, queryLang: "ko" | "ja" | "en"): string {
  if (queryLang === "ja") {
    if (kind === "lodging") {
      return "ホテル ルームツアー";
    }
    if (kind === "eatery") {
      return "グルメ レビュー";
    }
    return "レビュー";
  }
  if (queryLang === "en") {
    if (kind === "lodging") {
      return "hotel room tour review";
    }
    if (kind === "eatery") {
      return "restaurant review vlog";
    }
    return "review";
  }
  if (kind === "lodging") {
    return "호텔 룸투어 후기";
  }
  if (kind === "eatery") {
    return "맛집 후기 브이로그";
  }
  return "후기";
}

/**
 * Audience language beats map region for review search.
 * Korean app users get Korean-uploader-leaning results even on Osaka pins.
 */
export function resolvePlaceReviewQueryLang(input: {
  audienceLocale?: AppLocale | string | null;
  mapRegion: MapRegionBias;
}): "ko" | "ja" | "en" {
  const locale = (input.audienceLocale ?? "").trim().toLowerCase();
  if (locale === "ko" || locale.startsWith("ko-")) {
    return "ko";
  }
  if (locale === "ja" || locale.startsWith("ja-")) {
    return "ja";
  }
  if (locale && locale !== "en" && !locale.startsWith("en-")) {
    // Other UI locales still prefer English travel reviews over Japanese local feed
    // when the pin is overseas; map-region JA only when audience is JP.
    if (input.mapRegion === "jp") {
      return "en";
    }
  }
  if (input.mapRegion === "jp") {
    return locale ? "en" : "ja";
  }
  if (input.mapRegion === "kr") {
    return "ko";
  }
  return "en";
}

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
  if (queryLang === "en") {
    return "en";
  }
  return queryLang;
}

export function buildReviewSearchQuery(input: {
  name: string;
  place: string | null;
  kind: PlaceReviewKind;
  queryLang: "ko" | "ja" | "en";
}): string {
  const name = normalizeText(input.name);
  const place = normalizeText(input.place);
  if (input.kind === "lodging") {
    const locality = place && !place.includes(name) ? place : "";
    return [name, locality, reviewKeyword(input.kind, input.queryLang)]
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  const base = [name, place].filter(Boolean).join(" ");
  return `${base} ${reviewKeyword(input.kind, input.queryLang)}`.trim();
}

function rankForAudience(
  rows: readonly YouTubeOfficialSearchResult[],
  queryLang: "ko" | "ja" | "en",
): YouTubeOfficialSearchResult[] {
  if (queryLang !== "ko") {
    return [...rows];
  }
  return [...rows].sort((a, b) => {
    const delta =
      scoreKoreanAudienceMatch(b) - scoreKoreanAudienceMatch(a);
    if (delta !== 0) {
      return delta;
    }
    return 0;
  });
}

function buildYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Prefer Hangul titles/channels when audience is Korean. */
export function scoreKoreanAudienceMatch(row: {
  title?: string | null;
  channelTitle?: string | null;
}): number {
  const title = normalizeText(row.title);
  const channel = normalizeText(row.channelTitle);
  let score = 0;
  if (HANGUL_RE.test(title)) {
    score += 40;
  }
  if (HANGUL_RE.test(channel)) {
    score += 35;
  }
  if (KANA_RE.test(title) && !HANGUL_RE.test(title)) {
    score -= 20;
  }
  if (KANA_RE.test(channel) && !HANGUL_RE.test(channel)) {
    score -= 15;
  }
  return score;
}

function tokenizePlaceName(name: string): string[] {
  return normalizeText(name)
    .split(/[\s·,、/|·\-]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

/** Score how closely a video title/channel matches the pinned place name. */
export function scorePlaceNameMatch(input: {
  placeName: string;
  title?: string | null;
  channelTitle?: string | null;
}): number {
  const placeName = normalizeText(input.placeName);
  if (!placeName) {
    return 0;
  }
  const blob = `${normalizeText(input.title)} ${normalizeText(input.channelTitle)}`.toLowerCase();
  const normalizedPlace = placeName.toLowerCase();
  if (blob.includes(normalizedPlace)) {
    return 120;
  }

  let score = 0;
  for (const token of tokenizePlaceName(normalizedPlace)) {
    const lowered = token.toLowerCase();
    if (lowered.length < 2) {
      continue;
    }
    if (blob.includes(lowered)) {
      score += lowered.length >= 4 ? 30 : 18;
    }
  }
  return score;
}

function rankReviewResults(input: {
  rows: readonly YouTubeOfficialSearchResult[];
  queryLang: "ko" | "ja" | "en";
  kind: PlaceReviewKind;
  placeName: string;
}): YouTubeOfficialSearchResult[] {
  const scored = [...input.rows].sort((left, right) => {
    const leftScore =
      scorePlaceNameMatch({
        placeName: input.placeName,
        title: left.title,
        channelTitle: left.channelTitle,
      }) + scoreKoreanAudienceMatch(left);
    const rightScore =
      scorePlaceNameMatch({
        placeName: input.placeName,
        title: right.title,
        channelTitle: right.channelTitle,
      }) + scoreKoreanAudienceMatch(right);
    return rightScore - leftScore;
  });

  if (input.kind === "lodging" || input.kind === "eatery") {
    const matched = scored.filter(
      (row) =>
        scorePlaceNameMatch({
          placeName: input.placeName,
          title: row.title,
          channelTitle: row.channelTitle,
        }) >= 18,
    );
    if (matched.length > 0) {
      return matched;
    }
  }

  return input.queryLang === "ko" ? rankForAudience(scored, input.queryLang) : scored;
}

/** Server-side: resolve top embeddable review/tour videos linked to a pinned place. */
export async function resolvePlaceReviewVideos(input: {
  name: string;
  place?: string | null;
  kind?: PlaceReviewKind;
  lat?: number | null;
  lng?: number | null;
  /** App UI locale — Korean users prefer Korean-uploaded reviews. */
  audienceLocale?: AppLocale | string | null;
}): Promise<PlaceReviewVideoResult> {
  const kind = input.kind ?? "place";
  const mapRegion = inferMapRegionBias({
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    areaLabel: input.place ?? input.name,
  });
  const queryLang = resolvePlaceReviewQueryLang({
    audienceLocale: input.audienceLocale,
    mapRegion,
  });
  const query = buildReviewSearchQuery({
    name: input.name,
    place: input.place ?? null,
    kind,
    queryLang,
  });
  const searchUrl = buildYouTubeSearchUrl(query);

  const results = await searchYouTubeVideos({
    query,
    regionCode: regionCodeForAudience(queryLang),
    relevanceLanguage: relevanceLanguage(queryLang),
    maxResults: SEARCH_POOL,
  });
  if (results.length === 0) {
    return { videos: [], searchUrl };
  }

  const quality = await fetchYouTubeVideoQualityByIds(
    results.map((row) => row.videoId),
  );
  const embeddable = results.filter((row) => quality.get(row.videoId)?.embeddable);
  const ranked = rankReviewResults({
    rows: embeddable,
    queryLang,
    kind,
    placeName: input.name,
  });
  const videos: PlaceReviewVideo[] = ranked.slice(0, MAX_REVIEW_VIDEOS).map((row) => ({
    videoId: row.videoId,
    title: normalizeText(row.title) || null,
    channelTitle: normalizeText(row.channelTitle) || null,
    thumbnailUrl: row.thumbnailUrl ?? null,
    embedUrl: `https://www.youtube-nocookie.com/embed/${row.videoId}`,
    watchUrl: row.canonicalUrl,
  }));

  return { videos, searchUrl };
}
