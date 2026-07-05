import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

export function isBrainSurfaceMicroPlacePin(
  candidate: BrainSurfaceProjectionCandidate,
): boolean {
  return Boolean(
    candidate.markerThumbnailUrl?.trim() &&
      (candidate.family === "eatery" ||
        candidate.family === "lodging" ||
        candidate.family === "trace_place"),
  );
}

/** Map canvas — real places and media only; virtual ontology stays in the peek graph. */
export function isBrainSurfaceMapPinCandidate(
  candidate: BrainSurfaceProjectionCandidate,
): boolean {
  if (candidate.anchorKind === "inferred_place") {
    return Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng);
  }
  if (candidate.virtualCandidate) {
    if (
      candidate.anchorKind === "video_root" &&
      candidate.markerThumbnailUrl?.trim()
    ) {
      return true;
    }
    return false;
  }
  if (candidate.markerThumbnailUrl?.trim()) {
    return true;
  }
  return isBrainSurfaceMicroPlacePin(candidate);
}

export function filterBrainSurfaceMapPinCandidates(
  candidates: readonly BrainSurfaceProjectionCandidate[],
): BrainSurfaceProjectionCandidate[] {
  return candidates.filter(isBrainSurfaceMapPinCandidate);
}
