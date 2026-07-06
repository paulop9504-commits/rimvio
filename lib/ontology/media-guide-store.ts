import { asRimvioEntityId, type RimvioEntityId } from "@/lib/ontology/entity-types";
import {
  EMPTY_MEDIA_GUIDE_SNAPSHOT,
  MEDIA_GUIDE_SNAPSHOT_VERSION,
  type MediaGuideNode,
  type MediaGuideSnapshot,
} from "@/lib/ontology/media-guide-types";
import { filterPlayableMediaGuides } from "@/lib/ontology/playable-youtube-media-guide";
import { filterTrustedMediaGuides } from "@/lib/ontology/media-guide-quality-gate";

const STORAGE_KEY = "rimvio.media-guides.v1";

let cache: MediaGuideSnapshot | null = null;
let memoryStore: MediaGuideSnapshot = { ...EMPTY_MEDIA_GUIDE_SNAPSHOT };

function clone(snapshot: MediaGuideSnapshot): MediaGuideSnapshot {
  return {
    version: snapshot.version,
    guides: snapshot.guides.map((guide) => ({
      ...guide,
      youtubeOfficial: guide.youtubeOfficial
        ? {
            ...guide.youtubeOfficial,
            tags: [...guide.youtubeOfficial.tags],
            thumbnails: { ...guide.youtubeOfficial.thumbnails },
            relatedSearchResults: guide.youtubeOfficial.relatedSearchResults.map((result) => ({
              ...result,
              thumbnails: { ...result.thumbnails },
            })),
          }
        : null,
      moments: guide.moments.map((moment) => ({ ...moment })),
      primaryMoment: guide.primaryMoment ? { ...guide.primaryMoment } : null,
      inferredPlaceCandidates: (guide.inferredPlaceCandidates ?? []).map((candidate) => ({
        ...candidate,
        situationalHintsKo: [...(candidate.situationalHintsKo ?? [])],
        searchProfile: { ...candidate.searchProfile },
      })),
    })),
    updatedAt: snapshot.updatedAt,
  };
}

function readStorage(): MediaGuideSnapshot | null {
  if (typeof window === "undefined") {
    return clone(memoryStore);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as MediaGuideSnapshot;
    if (parsed.version !== MEDIA_GUIDE_SNAPSHOT_VERSION || !Array.isArray(parsed.guides)) {
      return null;
    }
    return {
      version: MEDIA_GUIDE_SNAPSHOT_VERSION,
      guides: [...parsed.guides],
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeStorage(snapshot: MediaGuideSnapshot): void {
  if (typeof window === "undefined") {
    memoryStore = clone(snapshot);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function sortGuides(guides: readonly MediaGuideNode[]): MediaGuideNode[] {
  return [...guides].sort(
    (left, right) =>
      right.relevanceScore - left.relevanceScore ||
      right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function readMediaGuideSnapshot(): MediaGuideSnapshot {
  if (cache) {
    return clone(cache);
  }
  const stored = readStorage();
  if (stored) {
    cache = stored;
    return clone(stored);
  }
  return clone(EMPTY_MEDIA_GUIDE_SNAPSHOT);
}

export function writeMediaGuideSnapshot(snapshot: MediaGuideSnapshot): MediaGuideSnapshot {
  const next: MediaGuideSnapshot = {
    version: MEDIA_GUIDE_SNAPSHOT_VERSION,
    guides: sortGuides(snapshot.guides),
    updatedAt: snapshot.updatedAt,
  };
  cache = next;
  writeStorage(next);
  return clone(next);
}

export function replaceMediaGuidesForExperience(input: {
  experienceEntityId: RimvioEntityId;
  guides: readonly MediaGuideNode[];
  updatedAt?: string;
}): MediaGuideSnapshot {
  const current = readMediaGuideSnapshot();
  const nextGuides = [
    ...current.guides.filter(
      (guide) => guide.relatedExperienceEntityId !== input.experienceEntityId,
    ),
    ...filterTrustedMediaGuides(filterPlayableMediaGuides(input.guides)),
  ];
  return writeMediaGuideSnapshot({
    version: MEDIA_GUIDE_SNAPSHOT_VERSION,
    guides: nextGuides,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  });
}

export function queryMediaGuidesForEntity(
  entityId: RimvioEntityId,
  options?: { max?: number },
): MediaGuideNode[] {
  const snapshot = readMediaGuideSnapshot();
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  return sortGuides(
    filterTrustedMediaGuides(
      filterPlayableMediaGuides(
        snapshot.guides.filter(
          (guide) =>
            guide.relatedExperienceEntityId === entityId ||
            guide.relatedPlaceEntityId === entityId,
        ),
      ),
    ),
  ).slice(0, max);
}

export function queryMediaGuidesForEvent(
  eventId: string,
  options?: { max?: number },
): MediaGuideNode[] {
  return queryMediaGuidesForEntity(asRimvioEntityId("experience", eventId), options);
}

export function queryMediaGuideByGuideNodeId(
  guideNodeId: string | null | undefined,
): MediaGuideNode | null {
  const key = guideNodeId?.trim();
  if (!key) {
    return null;
  }
  return readMediaGuideSnapshot().guides.find((guide) => guide.guideNodeId === key) ?? null;
}

export function resetMediaGuideStoreForTests(): void {
  cache = null;
  memoryStore = { ...EMPTY_MEDIA_GUIDE_SNAPSHOT };
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
