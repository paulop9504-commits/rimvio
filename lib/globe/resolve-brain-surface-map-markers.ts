import { layoutBrainSurfaceCalloutMarkers } from "@/lib/globe/layout-brain-surface-callout-markers";
import {
  pickCoreBrainSurfaceCandidates,
  resolveRelatedBrainSurfaceCandidates,
  type BrainSurfaceDisclosureStage,
} from "@/lib/globe/brain-surface-progressive-disclosure";
import { filterVisibleBrainSurfaceCandidates } from "@/lib/globe/brain-surface-marker-media";
import { filterBrainSurfaceMapPinCandidates } from "@/lib/globe/brain-surface-map-pin-visibility";
import {
  matchBrainSurfaceShadowExpandPin,
} from "@/lib/globe/brain-surface-shadow-expand";
import {
  pickBrainSurfaceSpatialTracePlaces,
  resolveBrainSurfaceSpatialTraceRoot,
  styleBrainSurfaceSpatialTraceMarkers,
} from "@/lib/globe/brain-surface-spatial-trace";
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

function visibleCandidates(
  candidates: readonly BrainSurfaceProjectionCandidate[],
): BrainSurfaceProjectionCandidate[] {
  return filterVisibleBrainSurfaceCandidates(candidates);
}

function isShadowExpandedMapPin(
  candidate: BrainSurfaceProjectionCandidate,
  clusterId: string,
  guideId: string | null,
): boolean {
  return matchBrainSurfaceShadowExpandPin(candidate, { clusterId, guideId });
}

function styleStoryMarkers(
  markers: BrainSurfaceProjectionCandidate[],
  activeId: string | null,
): BrainSurfaceProjectionCandidate[] {
  return markers.slice(0, 8).map((candidate, index) => ({
    ...candidate,
    markerStyle: "story" as const,
    calloutOffsetX: undefined,
    calloutOffsetY: undefined,
    focusPriority:
      activeId === candidate.id ? 100 : Math.max(72 - index * 3, 36),
    markerScale: activeId === candidate.id ? 1.14 : 1,
    markerOpacity: 1,
    zIndexBoost: activeId === candidate.id ? 8 : 5,
  }));
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
  videoGuideNodeId?: string | null;
  hubLat?: number | null;
  hubLng?: number | null;
  /** Instagram-style — core pins at real coords, no callout orbit. */
  storySpread?: boolean;
}): BrainSurfaceProjectionCandidate[] {
  const stage = input.disclosureStage ?? "related";
  const activeId = input.activeCandidateId?.trim() ?? null;
  const clusterId = input.videoClusterId?.trim() ?? null;
  const guideId = input.videoGuideNodeId?.trim() ?? null;

  if (input.shadowExpanded && clusterId) {
    const pool = input.candidates;
    const inferred = pool.filter(
      (row) =>
        isShadowExpandedMapPin(row, clusterId, guideId) &&
        row.anchorKind === "inferred_place" &&
        hasRealCoords(row),
    );
    const root = pool.find(
      (row) =>
        row.anchorKind === "video_root" &&
        row.clusterId === clusterId &&
        (!guideId ||
          row.sourceGuideNodeId === guideId ||
          row.parentGuideNodeId === guideId),
    );
    if (!root) {
      if (inferred.length === 0) {
        return [];
      }
      return styleBrainSurfaceSpatialTraceMarkers(inferred.slice(0, 4), activeId);
    }

    const traceRoot = resolveBrainSurfaceSpatialTraceRoot({
      root,
      hubLat: input.hubLat,
      hubLng: input.hubLng,
    });
    const tracePlaces = pickBrainSurfaceSpatialTracePlaces({
      root: traceRoot,
      inferred,
    });
    const chain = [traceRoot, ...tracePlaces];
    if (chain.length === 0) {
      return [];
    }
    return styleBrainSurfaceSpatialTraceMarkers(chain, activeId);
  }

  const pool = visibleCandidates(input.candidates);

  if (stage === "core") {
    const core = filterBrainSurfaceMapPinCandidates(
      pickCoreBrainSurfaceCandidates(pool).filter(hasRealCoords),
    );
    if (core.length === 0) {
      return [];
    }
    if (input.storySpread) {
      return styleStoryMarkers(core, activeId);
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
    const active = pool.find((row) => row.id === activeId);
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

  const active = pool.find((row) => row.id === activeId);
  if (!active || !hasRealCoords(active)) {
    return [];
  }

  if (active.anchorKind === "video_root") {
    if (input.storySpread) {
      const related = filterBrainSurfaceMapPinCandidates(
        resolveRelatedBrainSurfaceCandidates({
          active,
          candidates: pool,
        }).filter(hasRealCoords),
      );
      return styleStoryMarkers(related, activeId);
    }
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
    candidates: pool,
  }).filter(hasRealCoords);

  if (input.storySpread) {
    const mapPins = filterBrainSurfaceMapPinCandidates(related);
    const visible =
      mapPins.length > 0
        ? mapPins
        : filterBrainSurfaceMapPinCandidates([active]);
    return styleStoryMarkers(visible, activeId);
  }

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
