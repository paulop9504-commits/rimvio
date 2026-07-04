import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

function hasRealCoords(candidate: BrainSurfaceProjectionCandidate): boolean {
  return Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng);
}

function isMicroPlacePin(candidate: BrainSurfaceProjectionCandidate): boolean {
  return Boolean(
    candidate.markerThumbnailUrl?.trim() &&
      (candidate.family === "eatery" || candidate.family === "lodging"),
  );
}

/** Map pins — only the actively selected micro place; everything else lives in the explore rail. */
export function resolveBrainSurfaceMapMarkers(input: {
  candidates: readonly BrainSurfaceProjectionCandidate[];
  activeCandidateId?: string | null;
}): BrainSurfaceProjectionCandidate[] {
  const activeId = input.activeCandidateId?.trim() ?? null;
  if (!activeId) {
    return [];
  }

  const active = input.candidates.find((row) => row.id === activeId);
  if (!active || !hasRealCoords(active)) {
    return [];
  }
  if (active.anchorKind === "video_root") {
    return [];
  }
  if (!isMicroPlacePin(active)) {
    return [];
  }

  return [
    {
      ...active,
      calloutOffsetX: undefined,
      calloutOffsetY: undefined,
      focusPriority: 100,
      markerScale: 1.08,
      markerOpacity: 1,
      zIndexBoost: 4,
    },
  ];
}
