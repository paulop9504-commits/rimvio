import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

const MAP_MARKER_CAP = 4;

function hasRealCoords(candidate: BrainSurfaceProjectionCandidate): boolean {
  return Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng);
}

function isMicroPlacePin(candidate: BrainSurfaceProjectionCandidate): boolean {
  return Boolean(
    candidate.markerThumbnailUrl?.trim() &&
      (candidate.family === "eatery" || candidate.family === "lodging"),
  );
}

function mapPinScore(candidate: BrainSurfaceProjectionCandidate): number {
  if (isMicroPlacePin(candidate)) {
    return 90 + (candidate.focusPriority ?? 0) * 0.1;
  }
  if (candidate.anchorKind === "inferred_place" && candidate.markerThumbnailUrl) {
    return 70;
  }
  if (candidate.family === "trace_place") {
    return 40;
  }
  if (candidate.virtualCandidate) {
    return 10;
  }
  return 30;
}

/** Map pins — real micro places only; macro ghosts live in the explore rail. */
export function resolveBrainSurfaceMapMarkers(input: {
  candidates: readonly BrainSurfaceProjectionCandidate[];
  activeCandidateId?: string | null;
}): BrainSurfaceProjectionCandidate[] {
  const activeId = input.activeCandidateId?.trim() ?? null;
  const eligible = input.candidates.filter((candidate) => {
    if (!hasRealCoords(candidate)) {
      return false;
    }
    if (candidate.id === activeId) {
      return isMicroPlacePin(candidate) || candidate.anchorKind === "inferred_place";
    }
    if (candidate.anchorKind === "video_root") {
      return false;
    }
    if (candidate.virtualCandidate && !candidate.markerThumbnailUrl?.trim()) {
      return false;
    }
    if (
      candidate.family === "info" ||
      candidate.family === "event" ||
      candidate.family === "memo"
    ) {
      return false;
    }
    return isMicroPlacePin(candidate) || candidate.anchorKind === "inferred_place";
  });

  const ranked = [...eligible].sort(
    (left, right) => mapPinScore(right) - mapPinScore(left),
  );
  const capped = ranked.slice(0, MAP_MARKER_CAP);
  const selectedIds = new Set(capped.map((row) => row.id));
  if (activeId && !selectedIds.has(activeId)) {
    const active = input.candidates.find((row) => row.id === activeId);
    if (active && hasRealCoords(active) && active.anchorKind !== "video_root") {
      capped.unshift(active);
    }
  }

  return capped.map((candidate) => {
    const active = candidate.id === activeId;
    return {
      ...candidate,
      calloutOffsetX: undefined,
      calloutOffsetY: undefined,
      focusPriority: active ? 100 : candidate.focusPriority ?? 50,
      markerScale: active ? 1.08 : 0.94,
      markerOpacity: active ? 1 : 0.9,
      zIndexBoost: active ? 4 : 1,
    };
  });
}
