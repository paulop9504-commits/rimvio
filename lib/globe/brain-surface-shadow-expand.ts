import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

export function matchBrainSurfaceShadowExpandPin(
  candidate: BrainSurfaceProjectionCandidate,
  input: {
    clusterId: string;
    guideId: string | null;
  },
): boolean {
  if (!Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lng)) {
    return false;
  }
  if (
    candidate.anchorKind === "inferred_place" &&
    candidate.clusterId === input.clusterId
  ) {
    return true;
  }
  if (
    input.guideId &&
    candidate.sourceGuideNodeId === input.guideId &&
    (candidate.family === "lodging" || candidate.family === "eatery") &&
    candidate.markerThumbnailUrl?.trim()
  ) {
    return true;
  }
  return false;
}

export function filterBrainSurfaceShadowExpandPins<
  T extends BrainSurfaceProjectionCandidate,
>(
  candidates: readonly T[],
  input: {
    clusterId: string;
    guideId: string | null;
  },
): T[] {
  return candidates.filter((candidate) =>
    matchBrainSurfaceShadowExpandPin(candidate, input),
  );
}
