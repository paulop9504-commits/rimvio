import { layoutBrainSurfaceCalloutMarkers } from "@/lib/globe/layout-brain-surface-callout-markers";
import {
  pickCoreBrainSurfaceCandidates,
  resolveRelatedBrainSurfaceCandidates,
  type BrainSurfaceDisclosureStage,
} from "@/lib/globe/brain-surface-progressive-disclosure";
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

function styleCalloutMarkers(
  markers: BrainSurfaceProjectionCandidate[],
  activeId: string | null,
): BrainSurfaceProjectionCandidate[] {
  return markers.map((candidate, index) => ({
    ...candidate,
    focusPriority:
      activeId === candidate.id ? 100 : Math.max(88 - index * 4, 40),
    markerScale: activeId === candidate.id ? 1.1 : 1,
    markerOpacity: 1,
    zIndexBoost: activeId === candidate.id ? 5 : 3,
  }));
}

function resolveHubCoords(input: {
  hubLat?: number | null;
  hubLng?: number | null;
  fallback: BrainSurfaceProjectionCandidate;
}): { lat: number; lng: number } | null {
  const lat = input.hubLat ?? input.fallback.lat;
  const lng = input.hubLng ?? input.fallback.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat: lat as number, lng: lng as number };
}

/** Map pins — progressive disclosure: core orbit → related cluster → detail pin. */
export function resolveBrainSurfaceMapMarkers(input: {
  candidates: readonly BrainSurfaceProjectionCandidate[];
  disclosureStage?: BrainSurfaceDisclosureStage;
  activeCandidateId?: string | null;
  shadowExpanded?: boolean;
  videoClusterId?: string | null;
  hubLat?: number | null;
  hubLng?: number | null;
}): BrainSurfaceProjectionCandidate[] {
  const stage = input.disclosureStage ?? "related";
  const activeId = input.activeCandidateId?.trim() ?? null;
  const clusterId = input.videoClusterId?.trim() ?? null;

  if (input.shadowExpanded && clusterId) {
    const inferred = input.candidates.filter((row) =>
      isVideoInferredPlace(row, clusterId),
    );
    if (inferred.length === 0) {
      return [];
    }

    const hub = resolveHubCoords({
      hubLat: input.hubLat,
      hubLng: input.hubLng,
      fallback:
        inferred.find((row) => row.anchorKind === "video_root") ?? inferred[0]!,
    });
    if (!hub) {
      return inferred.slice(0, 6);
    }

    return styleCalloutMarkers(
      layoutBrainSurfaceCalloutMarkers({
        candidates: inferred.slice(0, 6),
        hubLat: hub.lat,
        hubLng: hub.lng,
      }),
      activeId,
    );
  }

  if (stage === "core") {
    const core = pickCoreBrainSurfaceCandidates(input.candidates).filter(hasRealCoords);
    if (core.length === 0) {
      return [];
    }
    const hub = resolveHubCoords({
      hubLat: input.hubLat,
      hubLng: input.hubLng,
      fallback: core[0]!,
    });
    if (!hub) {
      return core.slice(0, 4);
    }
    return styleCalloutMarkers(
      layoutBrainSurfaceCalloutMarkers({
        candidates: core.slice(0, 4),
        hubLat: hub.lat,
        hubLng: hub.lng,
      }),
      null,
    );
  }

  if (stage === "detail") {
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

  if (!activeId) {
    return [];
  }

  const active = input.candidates.find((row) => row.id === activeId);
  if (!active || !hasRealCoords(active)) {
    return [];
  }

  if (active.anchorKind === "video_root") {
    const hub = resolveHubCoords({
      hubLat: input.hubLat,
      hubLng: input.hubLng,
      fallback: active,
    });
    if (!hub) {
      return [];
    }
    return styleCalloutMarkers(
      layoutBrainSurfaceCalloutMarkers({
        candidates: [active],
        hubLat: hub.lat,
        hubLng: hub.lng,
      }),
      activeId,
    );
  }

  const related = resolveRelatedBrainSurfaceCandidates({
    active,
    candidates: input.candidates,
  }).filter(hasRealCoords);

  if (related.length === 1 && isMicroPlacePin(active)) {
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

  const hub = resolveHubCoords({
    hubLat: input.hubLat,
    hubLng: input.hubLng,
    fallback: active,
  });
  if (!hub) {
    return related.slice(0, 6);
  }

  return styleCalloutMarkers(
    layoutBrainSurfaceCalloutMarkers({
      candidates: related.slice(0, 6),
      hubLat: hub.lat,
      hubLng: hub.lng,
    }),
    activeId,
  );
}
