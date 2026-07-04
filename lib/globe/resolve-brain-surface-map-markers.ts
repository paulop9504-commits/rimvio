import { layoutBrainSurfaceCalloutMarkers } from "@/lib/globe/layout-brain-surface-callout-markers";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

function hasRealCoords(candidate: BrainSurfaceProjectionCandidate): boolean {
  return Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng);
}

function isMicroPlacePin(candidate: BrainSurfaceProjectionCandidate): boolean {
  return Boolean(
    candidate.markerThumbnailUrl?.trim() &&
      (candidate.family === "eatery" ||
        candidate.family === "lodging" ||
        candidate.family === "trace_place"),
  );
}

function isVideoInferredPlace(
  candidate: BrainSurfaceProjectionCandidate,
  clusterId: string,
): boolean {
  return (
    candidate.clusterId === clusterId &&
    candidate.anchorKind === "inferred_place" &&
    hasRealCoords(candidate)
  );
}

/** Map pins — shadow partner expand shows video-linked micro places; otherwise one active pin. */
export function resolveBrainSurfaceMapMarkers(input: {
  candidates: readonly BrainSurfaceProjectionCandidate[];
  activeCandidateId?: string | null;
  shadowExpanded?: boolean;
  videoClusterId?: string | null;
  hubLat?: number | null;
  hubLng?: number | null;
}): BrainSurfaceProjectionCandidate[] {
  const clusterId = input.videoClusterId?.trim() ?? null;

  if (input.shadowExpanded && clusterId) {
    const inferred = input.candidates.filter((row) =>
      isVideoInferredPlace(row, clusterId),
    );
    if (inferred.length === 0) {
      return [];
    }

    const hubLat =
      input.hubLat ??
      inferred.find((row) => row.anchorKind === "video_root")?.lat ??
      inferred[0]?.lat;
    const hubLng =
      input.hubLng ??
      inferred.find((row) => row.anchorKind === "video_root")?.lng ??
      inferred[0]?.lng;

    if (!Number.isFinite(hubLat) || !Number.isFinite(hubLng)) {
      return inferred.slice(0, 6);
    }

    const activeId = input.activeCandidateId?.trim() ?? null;
    return layoutBrainSurfaceCalloutMarkers({
      candidates: inferred.slice(0, 6),
      hubLat: hubLat as number,
      hubLng: hubLng as number,
    }).map((candidate, index) => ({
      ...candidate,
      focusPriority: activeId === candidate.id ? 100 : 88 - index,
      markerScale: activeId === candidate.id ? 1.1 : 1,
      markerOpacity: 1,
      zIndexBoost: activeId === candidate.id ? 5 : 3,
    }));
  }

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
