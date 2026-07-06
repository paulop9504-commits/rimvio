import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";

/** System-pulled YouTube must clear this view floor (300k). */
export const MIN_TRUSTED_YOUTUBE_VIEW_COUNT = 300_000;

/** Public pages below this relevance score stay out unless official/guide. */
export const MIN_TRUSTED_PUBLIC_PAGE_RELEVANCE = 58;

export function readMediaGuideYoutubeViewCount(
  guide: MediaGuideNode,
): number | null {
  if (guide.sourceKind !== "youtube") {
    return null;
  }
  const raw = guide.youtubeOfficial?.viewCount;
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? raw : null;
}

export function meetsTrustedYoutubeViewGate(
  viewCount: number | null | undefined,
  options?: { requireKnown?: boolean },
): boolean {
  const requireKnown = options?.requireKnown === true;
  if (viewCount == null || !Number.isFinite(viewCount)) {
    return !requireKnown;
  }
  return viewCount >= MIN_TRUSTED_YOUTUBE_VIEW_COUNT;
}

export function isTrustedMediaGuide(guide: MediaGuideNode): boolean {
  if (guide.sourceKind === "youtube") {
    if (!guide.embedUrl?.trim()) {
      return false;
    }
    return meetsTrustedYoutubeViewGate(readMediaGuideYoutubeViewCount(guide));
  }

  if (guide.sourceKind === "public_page") {
    if (guide.trustLevel === "official" || guide.trustLevel === "guide") {
      return Boolean(guide.title?.trim() || guide.thumbnailUrl?.trim());
    }
    return guide.relevanceScore >= MIN_TRUSTED_PUBLIC_PAGE_RELEVANCE;
  }

  return true;
}

export function filterTrustedMediaGuides<T extends MediaGuideNode>(
  guides: readonly T[],
): T[] {
  return guides.filter(isTrustedMediaGuide);
}

export function compareTrustedMediaGuides(
  left: MediaGuideNode,
  right: MediaGuideNode,
): number {
  const trustRank = (guide: MediaGuideNode): number => {
    if (guide.sourceKind === "youtube") {
      const views = readMediaGuideYoutubeViewCount(guide) ?? 0;
      return 40 + Math.min(30, Math.log10(Math.max(views, 1)) * 6);
    }
    if (guide.trustLevel === "official") {
      return 50;
    }
    if (guide.trustLevel === "guide") {
      return 35;
    }
    return 20;
  };

  return (
    trustRank(right) - trustRank(left) ||
    right.relevanceScore - left.relevanceScore ||
    right.updatedAt.localeCompare(left.updatedAt)
  );
}
