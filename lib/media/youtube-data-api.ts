import {
  extractYouTubeVideoId,
  normalizeYouTubeUrl,
} from "@/lib/enrichers/youtube-url";
import {
  resolveGooglePlacesApiKey,
  type GooglePlacesApiKeyEnvName,
} from "@/lib/locate/google-places-config";

const YOUTUBE_DATA_API_ROOT = "https://www.googleapis.com/youtube/v3";
const FETCH_TIMEOUT_MS = 8_000;
const DEFAULT_RELATED_RESULTS_LIMIT = 3;

export const YOUTUBE_DATA_API_KEY_ENV_PRIORITY = [
  "YOUTUBE_DATA_API_KEY",
] as const;

export type YouTubeDataApiKeyEnvName =
  | (typeof YOUTUBE_DATA_API_KEY_ENV_PRIORITY)[number]
  | GooglePlacesApiKeyEnvName;

export type ResolvedYouTubeDataApiKey = {
  name: YouTubeDataApiKeyEnvName;
  value: string;
};

export type YouTubeThumbnailSet = {
  default: string | null;
  medium: string | null;
  high: string | null;
  standard: string | null;
  maxres: string | null;
};

export type YouTubeOfficialVideo = {
  videoId: string;
  canonicalUrl: string;
  title: string | null;
  description: string | null;
  channelId: string | null;
  channelTitle: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  liveBroadcastContent: string | null;
  /** false when the owner disabled embedding on other sites */
  embeddable: boolean;
  viewCount: number | null;
  tags: readonly string[];
  thumbnails: YouTubeThumbnailSet;
  thumbnailUrl: string | null;
};

export type YouTubeOfficialChannel = {
  channelId: string;
  title: string | null;
  description: string | null;
  customUrl: string | null;
  canonicalUrl: string;
  thumbnails: YouTubeThumbnailSet;
  thumbnailUrl: string | null;
};

export type YouTubeOfficialSearchResult = {
  videoId: string;
  canonicalUrl: string;
  title: string | null;
  description: string | null;
  channelId: string | null;
  channelTitle: string | null;
  publishedAt: string | null;
  thumbnails: YouTubeThumbnailSet;
  thumbnailUrl: string | null;
};

export type YouTubeOfficialVideoBundle = {
  apiKeySource: YouTubeDataApiKeyEnvName;
  video: YouTubeOfficialVideo;
  channel: YouTubeOfficialChannel | null;
  relatedSearchResults: readonly YouTubeOfficialSearchResult[];
};

type ThumbnailMap = Partial<
  Record<keyof YouTubeThumbnailSet, { url?: string | null } | null | undefined>
>;

type YouTubeApiListResponse<T> = {
  items?: T[];
};

type YouTubeVideoItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    liveBroadcastContent?: string;
    tags?: string[];
    thumbnails?: ThumbnailMap;
  };
  contentDetails?: {
    duration?: string;
  };
  status?: {
    embeddable?: boolean;
    privacyStatus?: string;
  };
  statistics?: {
    viewCount?: string;
  };
};

type YouTubeChannelItem = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    thumbnails?: ThumbnailMap;
  };
};

type YouTubeSearchItem = {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: ThumbnailMap;
  };
};

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/gu, " ") ?? "";
  return normalized || null;
}

function buildWatchUrl(videoId: string) {
  return normalizeYouTubeUrl(`https://www.youtube.com/watch?v=${videoId}`);
}

function buildChannelUrl(channelId: string, customUrl: string | null) {
  if (customUrl) {
    const handle = customUrl.startsWith("@") ? customUrl : `@${customUrl}`;
    return `https://www.youtube.com/${handle}`;
  }
  return `https://www.youtube.com/channel/${channelId}`;
}

export function parseYouTubeIsoDurationSeconds(
  value: string | null | undefined,
): number | null {
  const clean = value?.trim();
  if (!clean) {
    return null;
  }
  const match = clean.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/iu);
  if (!match) {
    return null;
  }
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

export function resolveYouTubeDataApiKey(): ResolvedYouTubeDataApiKey | null {
  const dedicatedKey = process.env.YOUTUBE_DATA_API_KEY?.trim();
  if (dedicatedKey) {
    return { name: "YOUTUBE_DATA_API_KEY", value: dedicatedKey };
  }

  const sharedGoogleKey = resolveGooglePlacesApiKey();
  return sharedGoogleKey
    ? { name: sharedGoogleKey.name, value: sharedGoogleKey.value }
    : null;
}

export function isYouTubeDataApiConfigured() {
  return Boolean(resolveYouTubeDataApiKey());
}

export function toYouTubeThumbnailSet(
  thumbnails: ThumbnailMap | null | undefined,
): YouTubeThumbnailSet {
  return {
    default: normalizeText(thumbnails?.default?.url),
    medium: normalizeText(thumbnails?.medium?.url),
    high: normalizeText(thumbnails?.high?.url),
    standard: normalizeText(thumbnails?.standard?.url),
    maxres: normalizeText(thumbnails?.maxres?.url),
  };
}

export function pickBestYouTubeThumbnail(
  thumbnails: YouTubeThumbnailSet | null | undefined,
): string | null {
  if (!thumbnails) {
    return null;
  }
  return (
    thumbnails.maxres ??
    thumbnails.standard ??
    thumbnails.high ??
    thumbnails.medium ??
    thumbnails.default ??
    null
  );
}

async function fetchYouTubeDataJson<T>(
  apiKey: ResolvedYouTubeDataApiKey,
  resource: string,
  params: Record<string, string | number | null | undefined>,
): Promise<T | null> {
  const url = new URL(`${YOUTUBE_DATA_API_ROOT}/${resource}`);
  url.searchParams.set("key", apiKey.value);
  for (const [key, value] of Object.entries(params)) {
    if (value == null) {
      continue;
    }
    const text = String(value).trim();
    if (!text) {
      continue;
    }
    url.searchParams.set(key, text);
  }

  try {
    const response = await fetch(url.href, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function parseViewCount(value: string | null | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function mapVideoItem(item: YouTubeVideoItem): YouTubeOfficialVideo | null {
  const videoId = normalizeText(item.id);
  if (!videoId) {
    return null;
  }
  const thumbnails = toYouTubeThumbnailSet(item.snippet?.thumbnails);
  return {
    videoId,
    canonicalUrl: buildWatchUrl(videoId),
    title: normalizeText(item.snippet?.title),
    description: normalizeText(item.snippet?.description),
    channelId: normalizeText(item.snippet?.channelId),
    channelTitle: normalizeText(item.snippet?.channelTitle),
    publishedAt: normalizeText(item.snippet?.publishedAt),
    durationSeconds: parseYouTubeIsoDurationSeconds(item.contentDetails?.duration),
    liveBroadcastContent: normalizeText(item.snippet?.liveBroadcastContent),
    embeddable: item.status ? item.status.embeddable === true : false,
    viewCount: parseViewCount(item.statistics?.viewCount),
    tags: (item.snippet?.tags ?? [])
      .map((tag) => normalizeText(tag))
      .filter((tag): tag is string => Boolean(tag)),
    thumbnails,
    thumbnailUrl: pickBestYouTubeThumbnail(thumbnails),
  };
}

function mapChannelItem(item: YouTubeChannelItem): YouTubeOfficialChannel | null {
  const channelId = normalizeText(item.id);
  if (!channelId) {
    return null;
  }
  const thumbnails = toYouTubeThumbnailSet(item.snippet?.thumbnails);
  const customUrl = normalizeText(item.snippet?.customUrl);
  return {
    channelId,
    title: normalizeText(item.snippet?.title),
    description: normalizeText(item.snippet?.description),
    customUrl,
    canonicalUrl: buildChannelUrl(channelId, customUrl),
    thumbnails,
    thumbnailUrl: pickBestYouTubeThumbnail(thumbnails),
  };
}

function mapSearchItem(item: YouTubeSearchItem): YouTubeOfficialSearchResult | null {
  const videoId = normalizeText(item.id?.videoId);
  if (!videoId) {
    return null;
  }
  const thumbnails = toYouTubeThumbnailSet(item.snippet?.thumbnails);
  return {
    videoId,
    canonicalUrl: buildWatchUrl(videoId),
    title: normalizeText(item.snippet?.title),
    description: normalizeText(item.snippet?.description),
    channelId: normalizeText(item.snippet?.channelId),
    channelTitle: normalizeText(item.snippet?.channelTitle),
    publishedAt: normalizeText(item.snippet?.publishedAt),
    thumbnails,
    thumbnailUrl: pickBestYouTubeThumbnail(thumbnails),
  };
}

export async function fetchYouTubeOfficialVideo(
  input: { rawUrl: string } | { videoId: string },
): Promise<YouTubeOfficialVideo | null> {
  const apiKey = resolveYouTubeDataApiKey();
  if (!apiKey) {
    return null;
  }
  const videoId =
    "videoId" in input
      ? normalizeText(input.videoId)
      : extractYouTubeVideoId(input.rawUrl);
  if (!videoId) {
    return null;
  }

  const payload = await fetchYouTubeDataJson<YouTubeApiListResponse<YouTubeVideoItem>>(
    apiKey,
    "videos",
    {
      part: "snippet,contentDetails,status,statistics",
      id: videoId,
    },
  );
  return mapVideoItem(payload?.items?.[0] ?? {});
}

export type YouTubeVideoQualityRow = {
  videoId: string;
  embeddable: boolean;
  viewCount: number | null;
};

export type YouTubeVideoPlaybackRow = {
  videoId: string;
  embeddable: boolean;
  viewCount: number | null;
  durationSeconds: number | null;
  title: string | null;
  description: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
};

/** Batch embed + view-count gate for search candidates. */
export async function fetchYouTubeVideoQualityByIds(
  videoIds: readonly string[],
): Promise<Map<string, YouTubeVideoQualityRow>> {
  const apiKey = resolveYouTubeDataApiKey();
  const ids = [...new Set(videoIds.map((id) => normalizeText(id)).filter(Boolean))];
  const out = new Map<string, YouTubeVideoQualityRow>();
  if (!apiKey || ids.length === 0) {
    return out;
  }

  for (let offset = 0; offset < ids.length; offset += 50) {
    const chunk = ids.slice(offset, offset + 50);
    const payload = await fetchYouTubeDataJson<
      YouTubeApiListResponse<YouTubeVideoItem>
    >(apiKey, "videos", {
      part: "status,statistics",
      id: chunk.join(","),
    });
    for (const item of payload?.items ?? []) {
      const videoId = normalizeText(item.id);
      if (!videoId) {
        continue;
      }
      out.set(videoId, {
        videoId,
        embeddable: item.status?.embeddable === true,
        viewCount: parseViewCount(item.statistics?.viewCount),
      });
    }
  }
  return out;
}

/** Batch playback metadata — duration + snippet for lodging preview gate. */
export async function fetchYouTubeVideoPlaybackByIds(
  videoIds: readonly string[],
): Promise<Map<string, YouTubeVideoPlaybackRow>> {
  const apiKey = resolveYouTubeDataApiKey();
  const ids = [...new Set(videoIds.map((id) => normalizeText(id)).filter(Boolean))];
  const out = new Map<string, YouTubeVideoPlaybackRow>();
  if (!apiKey || ids.length === 0) {
    return out;
  }

  for (let offset = 0; offset < ids.length; offset += 50) {
    const chunk = ids.slice(offset, offset + 50);
    const payload = await fetchYouTubeDataJson<
      YouTubeApiListResponse<YouTubeVideoItem>
    >(apiKey, "videos", {
      part: "snippet,contentDetails,status,statistics",
      id: chunk.join(","),
    });
    for (const item of payload?.items ?? []) {
      const mapped = mapVideoItem(item);
      const videoId = mapped?.videoId;
      if (!videoId || !mapped) {
        continue;
      }
      out.set(videoId, {
        videoId,
        embeddable: mapped.embeddable,
        viewCount: mapped.viewCount,
        durationSeconds: mapped.durationSeconds,
        title: mapped.title,
        description: mapped.description,
        channelTitle: mapped.channelTitle,
        thumbnailUrl: mapped.thumbnailUrl,
      });
    }
  }
  return out;
}

/** Batch-check which video IDs allow iframe embed (YouTube Data API status.embeddable). */
export async function pickEmbeddableYouTubeVideoIds(
  videoIds: readonly string[],
): Promise<Set<string>> {
  const apiKey = resolveYouTubeDataApiKey();
  const ids = [...new Set(videoIds.map((id) => normalizeText(id)).filter(Boolean))];
  if (!apiKey || ids.length === 0) {
    return new Set();
  }

  const embeddable = new Set<string>();
  for (let offset = 0; offset < ids.length; offset += 50) {
    const chunk = ids.slice(offset, offset + 50);
    const payload = await fetchYouTubeDataJson<
      YouTubeApiListResponse<YouTubeVideoItem>
    >(apiKey, "videos", {
      part: "status,statistics",
      id: chunk.join(","),
    });
    for (const item of payload?.items ?? []) {
      const videoId = normalizeText(item.id);
      if (videoId && item.status?.embeddable === true) {
        embeddable.add(videoId);
      }
    }
  }
  return embeddable;
}

export async function searchYouTubeVideos(input: {
  query: string;
  regionCode?: string | null;
  relevanceLanguage?: string | null;
  maxResults?: number;
}): Promise<YouTubeOfficialSearchResult[]> {
  const apiKey = resolveYouTubeDataApiKey();
  if (!apiKey) {
    return [];
  }
  const query = normalizeText(input.query);
  if (!query) {
    return [];
  }
  const maxResults = Math.min(Math.max(input.maxResults ?? 3, 1), 15);
  const payload = await fetchYouTubeDataJson<
    YouTubeApiListResponse<YouTubeSearchItem>
  >(apiKey, "search", {
    part: "snippet",
    q: query,
    type: "video",
    maxResults,
    safeSearch: "moderate",
    regionCode: input.regionCode ?? undefined,
    relevanceLanguage: input.relevanceLanguage ?? undefined,
  });
  return (payload?.items ?? [])
    .map(mapSearchItem)
    .filter((row): row is YouTubeOfficialSearchResult => row != null);
}

export async function resolveYouTubeOfficialVideoBundle(
  input: {
    rawUrl: string;
    includeChannel?: boolean;
    includeRelatedSearchResults?: boolean;
    relatedSearchLimit?: number;
  } | {
    videoId: string;
    includeChannel?: boolean;
    includeRelatedSearchResults?: boolean;
    relatedSearchLimit?: number;
  },
): Promise<YouTubeOfficialVideoBundle | null> {
  const apiKey = resolveYouTubeDataApiKey();
  if (!apiKey) {
    return null;
  }
  const videoId =
    "videoId" in input
      ? normalizeText(input.videoId)
      : extractYouTubeVideoId(input.rawUrl);
  if (!videoId) {
    return null;
  }

  const videoPayload = await fetchYouTubeDataJson<
    YouTubeApiListResponse<YouTubeVideoItem>
  >(apiKey, "videos", {
    part: "snippet,contentDetails,status,statistics",
    id: videoId,
  });
  const video = mapVideoItem(videoPayload?.items?.[0] ?? {});
  if (!video) {
    return null;
  }

  const relatedLimit = Math.min(
    Math.max(input.relatedSearchLimit ?? DEFAULT_RELATED_RESULTS_LIMIT, 1),
    5,
  );

  const [channelPayload, searchPayload] = await Promise.all([
    input.includeChannel !== false && video.channelId
      ? fetchYouTubeDataJson<YouTubeApiListResponse<YouTubeChannelItem>>(
          apiKey,
          "channels",
          {
            part: "snippet",
            id: video.channelId,
          },
        )
      : Promise.resolve(null),
    input.includeRelatedSearchResults
      ? fetchYouTubeDataJson<YouTubeApiListResponse<YouTubeSearchItem>>(
          apiKey,
          "search",
          {
            part: "snippet",
            relatedToVideoId: video.videoId,
            type: "video",
            maxResults: relatedLimit,
            safeSearch: "moderate",
          },
        )
      : Promise.resolve(null),
  ]);

  return {
    apiKeySource: apiKey.name,
    video,
    channel: mapChannelItem(channelPayload?.items?.[0] ?? {}),
    relatedSearchResults: (searchPayload?.items ?? [])
      .map(mapSearchItem)
      .filter((row): row is YouTubeOfficialSearchResult => {
        if (row == null) {
          return false;
        }
        return row.videoId !== video.videoId;
      }),
  };
}
