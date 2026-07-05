import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/events/read-feed-capture-fragments";
import { buildContextInstance } from "@/lib/context-instance/build-context-instance";
import { fetchPageMetadata, normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";
import { fetchYouTubeOEmbed } from "@/lib/enrichers/fetch-youtube-oembed";
import { resolveBestTitle } from "@/lib/enrichers/url-intelligence";
import {
  formatYouTubeTimestamp,
  parseYouTubeStartSeconds,
} from "@/lib/enrichers/url-intelligence";
import {
  extractYouTubeVideoId,
  isYouTubeDomain,
  normalizeYouTubeUrl,
} from "@/lib/enrichers/youtube-url";
import { fetchYouTubeDurationSeconds } from "@/lib/media/fetch-youtube-duration";
import { resolveYouTubeOfficialVideoBundle } from "@/lib/media/youtube-data-api";
import { entityFromPlaceLabel } from "@/lib/ontology/entity-adapters";
import { asRimvioEntityId } from "@/lib/ontology/entity-types";
import type { FeedCaptureMediaTextSignal } from "@/lib/ontology/feed-capture-wire";
import { inferMediaGuidePlaceCandidates } from "@/lib/ontology/media-guide-place-inference";
import { discoverProactiveTravelYoutubeGuides } from "@/lib/ontology/discover-proactive-travel-youtube-guides";
import { filterPlayableMediaGuides } from "@/lib/ontology/playable-youtube-media-guide";
import type {
  MediaGuideMoment,
  MediaGuideNode,
  MediaGuideNodeId,
  MediaGuideTrustLevel,
} from "@/lib/ontology/media-guide-types";

const BLOCKED_PUBLIC_METADATA_HOSTS = [
  /(^|\.)instagram\.com$/i,
  /(^|\.)tiktok\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)x\.com$/i,
  /(^|\.)twitter\.com$/i,
  /(^|\.)threads\.net$/i,
  /(^|\.)reddit\.com$/i,
  /(^|\.)discord\.gg$/i,
  /(^|\.)discord\.com$/i,
  /(^|\.)slack\.com$/i,
  /(^|\.)open\.kakao\.com$/i,
  /(^|\.)cafe\.naver\.com$/i,
  /(^|\.)blog\.naver\.com$/i,
  /(^|\.)m\.blog\.naver\.com$/i,
  /(^|\.)post\.naver\.com$/i,
] as const;

const OFFICIAL_HOST_SIGNAL =
  /(^|\.)((go\.kr)|(gov)|(museum)|(or\.kr)|(airport)|(rail)|(metro)|(official))(?:$|\.)/i;
const GUIDE_TEXT_SIGNAL =
  /guide|travel|trip|tour|visit|itinerary|lonely\s*planet|tripadvisor|wanderlog|blog/i;
const CHAPTER_LINE_REGEX =
  /(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:[-–—|]\s*([^\n]{2,80}))?/g;

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function normalizeDomain(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, "");
}

function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildGuideNodeId(eventId: string, captureId: string | null, rawUrl: string): MediaGuideNodeId {
  const suffix = captureId?.trim() || hashText(rawUrl);
  return `guide:${eventId}:${suffix}` as MediaGuideNodeId;
}

function isBlockedGuideHost(domain: string): boolean {
  return BLOCKED_PUBLIC_METADATA_HOSTS.some((pattern) => pattern.test(domain));
}

function parseTimestampSeconds(value: string): number | null {
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  if (parts.length === 3) {
    return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  }
  if (parts.length === 2) {
    return parts[0]! * 60 + parts[1]!;
  }
  return null;
}

function buildMoment(seconds: number, title?: string | null): MediaGuideMoment {
  const timeLabel = formatYouTubeTimestamp(seconds);
  const cleanTitle = normalizeText(title) || null;
  return {
    seconds,
    timeLabel,
    title: cleanTitle,
    chipLabelKo: cleanTitle ? `${timeLabel} ${cleanTitle}` : `${timeLabel}부터`,
  };
}

function extractYouTubeMoments(
  description: string | null,
  startSeconds: number | null,
): MediaGuideMoment[] {
  const moments: MediaGuideMoment[] = [];
  const seen = new Set<number>();

  if (startSeconds != null && startSeconds > 0) {
    moments.push(buildMoment(startSeconds, null));
    seen.add(startSeconds);
  }

  const text = (description ?? "").replace(/&#10;|<br\s*\/?>/giu, "\n");
  for (const match of text.matchAll(CHAPTER_LINE_REGEX)) {
    const stamp = match[1];
    if (!stamp) {
      continue;
    }
    const seconds = parseTimestampSeconds(stamp);
    if (seconds == null || seen.has(seconds)) {
      continue;
    }
    seen.add(seconds);
    moments.push(buildMoment(seconds, match[2] ?? null));
    if (moments.length >= 3) {
      break;
    }
  }

  return moments;
}

function buildYouTubeOpenUrl(rawUrl: string, startSeconds: number | null): string {
  const watchUrl = new URL(normalizeYouTubeUrl(rawUrl));
  if (startSeconds != null && startSeconds > 0) {
    watchUrl.searchParams.set("t", `${startSeconds}s`);
  }
  return watchUrl.href;
}

function buildYouTubeEmbedUrl(videoId: string, startSeconds: number | null): string {
  const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
  if (startSeconds != null && startSeconds > 0) {
    embedUrl.searchParams.set("start", String(startSeconds));
  }
  return embedUrl.href;
}

function buildOfficialSearchSignals(input: {
  relatedPlaceLabel: string | null;
  capturePlaceLabel: string | null | undefined;
  relatedSearchResults: readonly {
    title: string | null;
    description: string | null;
  }[];
}): FeedCaptureMediaTextSignal[] {
  const focusPlace = normalizeText(input.capturePlaceLabel) || normalizeText(input.relatedPlaceLabel);
  if (!focusPlace) {
    return [];
  }

  const signals: FeedCaptureMediaTextSignal[] = [];
  for (const result of input.relatedSearchResults) {
    if (!matchesPlaceText(result.title ?? "", focusPlace) && !matchesPlaceText(result.description ?? "", focusPlace)) {
      continue;
    }
    if (result.title) {
      signals.push({ source: "title", text: result.title });
    }
    if (result.description) {
      signals.push({ source: "description", text: result.description });
    }
  }
  return signals;
}

function matchesPlaceText(haystack: string, needle: string | null | undefined): boolean {
  const left = normalizeText(haystack).toLowerCase();
  const right = normalizeText(needle).toLowerCase();
  if (!left || !right) {
    return false;
  }
  return left.includes(right) || right.includes(left);
}

function classifyGuideTrust(input: {
  sourceKind: MediaGuideNode["sourceKind"];
  domain: string;
  title: string | null;
  description: string | null;
}): { trustLevel: MediaGuideTrustLevel; trustLabelKo: string } {
  if (input.sourceKind === "youtube") {
    return { trustLevel: "video", trustLabelKo: "영상" };
  }
  const blob = `${input.domain} ${input.title ?? ""} ${input.description ?? ""}`;
  if (
    OFFICIAL_HOST_SIGNAL.test(input.domain) ||
    /official|공식|관광청|시청|구청|공항|철도/iu.test(blob)
  ) {
    return { trustLevel: "official", trustLabelKo: "공식" };
  }
  if (GUIDE_TEXT_SIGNAL.test(blob) || /가이드|여행|동선|방문 팁/u.test(blob)) {
    return { trustLevel: "guide", trustLabelKo: "가이드" };
  }
  return { trustLevel: "public", trustLabelKo: "공개" };
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(100, Math.round(value)));
}

function buildRelevance(input: {
  event: EventCandidate;
  relatedPlaceLabel: string | null;
  capturePlaceLabel: string | null | undefined;
  title: string;
  description: string | null;
  primaryMoment: MediaGuideMoment | null;
  trustLevel: MediaGuideTrustLevel;
  sourceKind: MediaGuideNode["sourceKind"];
}): { whyRelevantKo: string; relevanceScore: number } {
  const context = buildContextInstance({ event: input.event });
  const anchorLabel = context.location.areaLabel ?? context.location.anchor.profile.label ?? null;
  const destinationLabel = context.travel.destinationLabel ?? null;
  const blob = [
    input.capturePlaceLabel,
    input.relatedPlaceLabel,
    input.title,
    input.description,
  ]
    .filter(Boolean)
    .join(" ");

  const placeMatch =
    matchesPlaceText(blob, anchorLabel) ||
    matchesPlaceText(blob, destinationLabel) ||
    matchesPlaceText(blob, input.relatedPlaceLabel);
  const capturePlaceMatch =
    matchesPlaceText(input.capturePlaceLabel ?? "", anchorLabel) ||
    matchesPlaceText(input.capturePlaceLabel ?? "", destinationLabel);

  let score = 46;
  if (capturePlaceMatch) {
    score += 18;
  }
  if (placeMatch) {
    score += 14;
  }
  if (input.trustLevel === "official") {
    score += 10;
  } else if (input.trustLevel === "guide") {
    score += 6;
  }
  if (input.primaryMoment) {
    score += 8;
  }
  if (input.sourceKind === "youtube" && destinationLabel) {
    score += 6;
  }

  const focusPlace = anchorLabel ?? destinationLabel ?? input.relatedPlaceLabel;
  if (capturePlaceMatch && focusPlace) {
    return {
      whyRelevantKo: `${focusPlace} 맥락에 같이 붙어 있던 자료예요`,
      relevanceScore: clampScore(score),
    };
  }
  if (placeMatch && focusPlace && input.primaryMoment) {
    return {
      whyRelevantKo: `${focusPlace} 흐름이 보여서 ${input.primaryMoment.timeLabel}부터 바로 보기 좋아요`,
      relevanceScore: clampScore(score),
    };
  }
  if (placeMatch && focusPlace) {
    return {
      whyRelevantKo: `${focusPlace} 준비와 직접 이어지는 공개 자료예요`,
      relevanceScore: clampScore(score),
    };
  }
  if (input.trustLevel === "official" && focusPlace) {
    return {
      whyRelevantKo: `${focusPlace} 준비를 공식 안내로 바로 확인할 수 있어요`,
      relevanceScore: clampScore(score),
    };
  }
  if (input.primaryMoment) {
    return {
      whyRelevantKo: `${input.primaryMoment.timeLabel}부터 바로 보면 핵심 구간에 들어갈 수 있어요`,
      relevanceScore: clampScore(score),
    };
  }
  if (input.sourceKind === "youtube" && destinationLabel) {
    return {
      whyRelevantKo: `${destinationLabel} 감을 빠르게 잡기 좋은 영상이에요`,
      relevanceScore: clampScore(score),
    };
  }
  return {
    whyRelevantKo: "이 맥락 옆에 붙여 둘 공개 참고 자료예요",
    relevanceScore: clampScore(score),
  };
}

async function buildYouTubeGuide(input: {
  event: EventCandidate;
  url: string;
  captureId: string | null;
  capturePlaceLabel: string | null | undefined;
  relatedPlaceLabel: string | null;
  mediaTextSignals?: readonly FeedCaptureMediaTextSignal[];
}): Promise<MediaGuideNode | null> {
  const videoId = extractYouTubeVideoId(input.url);
  if (!videoId) {
    return null;
  }

  const normalizedUrl = normalizeYouTubeUrl(input.url);
  const [oembed, metadata, official] = await Promise.all([
    fetchYouTubeOEmbed(input.url),
    fetchPageMetadata(normalizedUrl),
    resolveYouTubeOfficialVideoBundle({
      rawUrl: input.url,
      includeChannel: true,
      includeRelatedSearchResults: true,
    }),
  ]);
  const durationSeconds =
    official?.video.durationSeconds ?? (await fetchYouTubeDurationSeconds(input.url));

  const title =
    resolveBestTitle({
      metadataTitle: official?.video.title ?? oembed?.title ?? metadata.title,
      rawUrl: normalizedUrl,
      domain: metadata.domain,
    }) ?? "YouTube";
  const rawDescription =
    official?.video.description ?? metadata.description ?? null;
  const description = normalizeText(rawDescription) || null;
  const startSeconds = parseYouTubeStartSeconds(input.url);
  const moments = extractYouTubeMoments(rawDescription, startSeconds);
  const primaryMoment = moments[0] ?? null;
  const trust = classifyGuideTrust({
    sourceKind: "youtube",
    domain: metadata.domain || "youtube.com",
    title,
    description,
  });
  const { whyRelevantKo, relevanceScore } = buildRelevance({
    event: input.event,
    relatedPlaceLabel: input.relatedPlaceLabel,
    capturePlaceLabel: input.capturePlaceLabel,
    title,
    description,
    primaryMoment,
    trustLevel: trust.trustLevel,
    sourceKind: "youtube",
  });
  const relatedPlaceEntityId = input.relatedPlaceLabel
    ? entityFromPlaceLabel(input.relatedPlaceLabel).entityId
    : null;
  const nowIso = new Date().toISOString();
  const officialSearchSignals = buildOfficialSearchSignals({
    relatedPlaceLabel: input.relatedPlaceLabel,
    capturePlaceLabel: input.capturePlaceLabel,
    relatedSearchResults: official?.relatedSearchResults ?? [],
  });
  const baseGuide = {
    guideNodeId: buildGuideNodeId(input.event.id, input.captureId, normalizedUrl),
    title,
    sourceKind: "youtube" as const,
    sourceLabelKo: "YouTube",
    trustLevel: trust.trustLevel,
    trustLabelKo: trust.trustLabelKo,
    canonicalUrl: official?.video.canonicalUrl ?? normalizedUrl,
    openUrl: buildYouTubeOpenUrl(input.url, primaryMoment?.seconds ?? startSeconds),
    embedUrl:
      official?.video.embeddable === true
        ? buildYouTubeEmbedUrl(videoId, primaryMoment?.seconds ?? startSeconds)
        : null,
    thumbnailUrl:
      official?.video.thumbnailUrl ??
      oembed?.thumbnail_url ??
      metadata.image ??
      null,
    description,
    providerName:
      official?.channel?.title ??
      official?.video.channelTitle ??
      normalizeText(oembed?.author_name) ??
      null,
    domain: metadata.domain || "youtube.com",
    durationSeconds: official?.video.durationSeconds ?? durationSeconds,
    youtubeOfficial: official
      ? {
          apiKeySource: official.apiKeySource,
          videoId: official.video.videoId,
          channelId: official.video.channelId,
          channelTitle:
            official.channel?.title ??
            official.video.channelTitle ??
            null,
          channelUrl: official.channel?.canonicalUrl ?? null,
          publishedAt: official.video.publishedAt,
          liveBroadcastContent: official.video.liveBroadcastContent,
          tags: official.video.tags,
          thumbnails: official.video.thumbnails,
          relatedSearchResults: official.relatedSearchResults.map((result) => ({
            videoId: result.videoId,
            canonicalUrl: result.canonicalUrl,
            title: result.title,
            description: result.description,
            channelId: result.channelId,
            channelTitle: result.channelTitle,
            publishedAt: result.publishedAt,
            thumbnailUrl: result.thumbnailUrl,
            thumbnails: result.thumbnails,
          })),
        }
      : null,
    moments,
    primaryMoment,
    relatedExperienceEntityId: asRimvioEntityId("experience", input.event.id),
    relatedPlaceEntityId,
    relatedPlaceLabel: input.relatedPlaceLabel,
    relatedCaptureId: input.captureId,
    whyRelevantKo,
    relevanceScore,
  };
  const inferredPlaceCandidates = inferMediaGuidePlaceCandidates({
    event: input.event,
    guide: baseGuide,
    capturePlaceLabel: input.capturePlaceLabel,
    mediaTextSignals: [...(input.mediaTextSignals ?? []), ...officialSearchSignals],
  });

  if (!baseGuide.embedUrl?.trim()) {
    return null;
  }

  return {
    ...baseGuide,
    inferredPlaceCandidates,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

async function buildPublicPageGuide(input: {
  event: EventCandidate;
  url: string;
  captureId: string | null;
  capturePlaceLabel: string | null | undefined;
  relatedPlaceLabel: string | null;
  domain: string;
  mediaTextSignals?: readonly FeedCaptureMediaTextSignal[];
}): Promise<MediaGuideNode | null> {
  if (isBlockedGuideHost(input.domain)) {
    return null;
  }

  const metadata = await fetchPageMetadata(input.url);
  const title =
    resolveBestTitle({
      metadataTitle: metadata.title,
      rawUrl: input.url,
      domain: metadata.domain,
    }) ?? normalizeDomain(input.domain);
  const description = normalizeText(metadata.description) || null;

  if (!title && !description && !metadata.image) {
    return null;
  }

  const trust = classifyGuideTrust({
    sourceKind: "public_page",
    domain: metadata.domain || input.domain,
    title,
    description,
  });
  const { whyRelevantKo, relevanceScore } = buildRelevance({
    event: input.event,
    relatedPlaceLabel: input.relatedPlaceLabel,
    capturePlaceLabel: input.capturePlaceLabel,
    title,
    description,
    primaryMoment: null,
    trustLevel: trust.trustLevel,
    sourceKind: "public_page",
  });
  const relatedPlaceEntityId = input.relatedPlaceLabel
    ? entityFromPlaceLabel(input.relatedPlaceLabel).entityId
    : null;
  const nowIso = new Date().toISOString();
  const baseGuide = {
    guideNodeId: buildGuideNodeId(input.event.id, input.captureId, input.url),
    title,
    sourceKind: "public_page" as const,
    sourceLabelKo: normalizeDomain(metadata.domain || input.domain),
    trustLevel: trust.trustLevel,
    trustLabelKo: trust.trustLabelKo,
    canonicalUrl: metadata.url || input.url,
    openUrl: metadata.url || input.url,
    embedUrl: null,
    thumbnailUrl: metadata.image ?? null,
    description,
    providerName: null,
    domain: normalizeDomain(metadata.domain || input.domain),
    durationSeconds: null,
    moments: [] as MediaGuideMoment[],
    primaryMoment: null,
    relatedExperienceEntityId: asRimvioEntityId("experience", input.event.id),
    relatedPlaceEntityId,
    relatedPlaceLabel: input.relatedPlaceLabel,
    relatedCaptureId: input.captureId,
    whyRelevantKo,
    relevanceScore,
  };
  const inferredPlaceCandidates = inferMediaGuidePlaceCandidates({
    event: input.event,
    guide: baseGuide,
    capturePlaceLabel: input.capturePlaceLabel,
    mediaTextSignals: input.mediaTextSignals,
  });

  return {
    ...baseGuide,
    inferredPlaceCandidates,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export async function resolveMediaGuideNodesForEvent(
  event: EventCandidate,
): Promise<MediaGuideNode[]> {
  const context = buildContextInstance({ event });
  const relatedPlaceLabel =
    normalizeText(context.location.areaLabel) ||
    normalizeText(context.location.anchor.profile.label) ||
    normalizeText(event.place) ||
    null;
  const deduped = new Set<string>();

  const guides = await Promise.all(
    readFeedCaptureFragments(event)
      .filter((fragment) => Boolean(normalizeText(fragment.url)))
      .map(async (fragment) => {
        const rawUrl = normalizeText(fragment.url);
        if (!rawUrl) {
          return null;
        }
        try {
          const parsed = normalizeInputUrl(rawUrl);
          const normalizedUrl = parsed.href.replace(/#.*$/, "");
          if (deduped.has(normalizedUrl)) {
            return null;
          }
          deduped.add(normalizedUrl);

          const domain = normalizeDomain(parsed.hostname);
          if (isYouTubeDomain(domain)) {
            return buildYouTubeGuide({
              event,
              url: normalizedUrl,
              captureId: fragment.id,
              capturePlaceLabel: fragment.placeLabel,
              relatedPlaceLabel,
              mediaTextSignals: fragment.mediaTextSignals,
            });
          }
          return buildPublicPageGuide({
            event,
            url: normalizedUrl,
            captureId: fragment.id,
            capturePlaceLabel: fragment.placeLabel,
            relatedPlaceLabel,
            domain,
            mediaTextSignals: fragment.mediaTextSignals,
          });
        } catch {
          return null;
        }
      }),
  );

  const captureGuides = filterPlayableMediaGuides(
    guides.filter((guide): guide is MediaGuideNode => Boolean(guide)),
  );
  const captureUrls = new Set(captureGuides.map((guide) => guide.canonicalUrl));
  const proactiveGuides =
    captureGuides.some((guide) => guide.sourceKind === "youtube")
      ? []
      : await discoverProactiveTravelYoutubeGuides(event);

  const merged = filterPlayableMediaGuides([
    ...captureGuides,
    ...proactiveGuides.filter((guide) => !captureUrls.has(guide.canonicalUrl)),
  ]);

  return merged.sort(
    (left, right) =>
      right.relevanceScore - left.relevanceScore ||
      right.updatedAt.localeCompare(left.updatedAt),
  );
}
