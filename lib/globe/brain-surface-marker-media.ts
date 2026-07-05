import type { BrainSurfaceCandidateFamily } from "@/lib/situation-projection/brain-surface-types";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

const FAMILY_STOCK: Record<BrainSurfaceCandidateFamily, string> = {
  media: "https://images.unsplash.com/photo-1478737270609-ffe7197d8a74?w=480&q=80",
  trace_place: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=480&q=80",
  eatery: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=480&q=80",
  lodging: "https://images.unsplash.com/photo-1566073771259-6a8506099925?w=480&q=80",
  info: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=480&q=80",
  event: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=480&q=80",
  memo: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=480&q=80",
};

export function hasExplicitMarkerThumbnail(
  thumbnailUrl: string | null | undefined,
): boolean {
  const raw = thumbnailUrl?.trim();
  if (!raw) {
    return false;
  }
  return !Object.values(FAMILY_STOCK).includes(raw);
}

export function resolveBrainSurfaceMarkerThumbnail(input: {
  family: BrainSurfaceCandidateFamily;
  thumbnailUrl?: string | null;
  /** @deprecated Stock placeholders are never shown on the map. */
  allowStockFallback?: boolean;
}): string | null {
  const explicit = input.thumbnailUrl?.trim();
  if (explicit) {
    return explicit;
  }
  if (input.allowStockFallback) {
    return FAMILY_STOCK[input.family] ?? null;
  }
  return null;
}

export function resolveBrainSurfaceMarkerMediaKind(input: {
  family: BrainSurfaceCandidateFamily;
  embedUrl?: string | null;
}): "image" | "video" | null {
  if (input.family === "media" && input.embedUrl?.trim()) {
    return "video";
  }
  return "image";
}

export function isEmbeddableBrainSurfaceVideo(
  candidate: BrainSurfaceProjectionCandidate,
): boolean {
  return Boolean(
    candidate.embedUrl?.trim() &&
      (candidate.anchorKind === "video_root" || candidate.family === "media"),
  );
}

/** Map / rail — only nodes with real photos or playable embeds. */
export function isBrainSurfaceCandidateVisible(
  candidate: BrainSurfaceProjectionCandidate,
): boolean {
  if (candidate.anchorKind === "video_root" || candidate.family === "media") {
    return isEmbeddableBrainSurfaceVideo(candidate);
  }
  if (candidate.family === "memo" || candidate.family === "info" || candidate.family === "event") {
    return hasExplicitMarkerThumbnail(candidate.markerThumbnailUrl);
  }
  return hasExplicitMarkerThumbnail(candidate.markerThumbnailUrl);
}

export function filterVisibleBrainSurfaceCandidates<
  T extends BrainSurfaceProjectionCandidate,
>(candidates: readonly T[]): T[] {
  return candidates.filter(isBrainSurfaceCandidateVisible);
}
