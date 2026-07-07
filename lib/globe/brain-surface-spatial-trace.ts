import { haversineKm } from "@/lib/feed/spacetime-fit";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";
import { resolveLocalDiscoveryRouteArcAltitude } from "@/lib/globe/context-condition-ai/build-context-condition-discovery-overlay";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

const MIN_SEPARATION_KM = 0.08;
const MIN_CONFIDENCE = 0.55;
const MAX_TRACE_PLACES = 3;

function hasCoords(
  row: Pick<BrainSurfaceProjectionCandidate, "lat" | "lng">,
): boolean {
  return Number.isFinite(row.lat) && Number.isFinite(row.lng);
}

function isConfidentInferredPlace(
  candidate: BrainSurfaceProjectionCandidate,
): boolean {
  if (candidate.anchorKind !== "inferred_place") {
    return false;
  }
  const confidence = candidate.confidence;
  if (confidence != null && confidence >= MIN_CONFIDENCE) {
    return true;
  }
  const hint =
    candidate.inferenceLabelKo?.trim() ||
    candidate.previewBody?.trim() ||
    candidate.relationMemoKo?.trim() ||
    "";
  return hint.length > 0;
}

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  return haversineKm(a.lat, a.lng, b.lat, b.lng);
}

function dedupeByProximity(
  rows: readonly BrainSurfaceProjectionCandidate[],
): BrainSurfaceProjectionCandidate[] {
  const kept: BrainSurfaceProjectionCandidate[] = [];
  for (const row of rows) {
    if (!hasCoords(row)) {
      continue;
    }
    const tooClose = kept.some(
      (existing) =>
        distanceKm(existing, row) < MIN_SEPARATION_KM,
    );
    if (!tooClose) {
      kept.push(row);
    }
  }
  return kept;
}

export function resolveBrainSurfaceSpatialTraceRoot(
  input: {
    root: BrainSurfaceProjectionCandidate;
    hubLat?: number | null;
    hubLng?: number | null;
  },
): BrainSurfaceProjectionCandidate {
  const hubLat = input.hubLat;
  const hubLng = input.hubLng;
  if (Number.isFinite(hubLat) && Number.isFinite(hubLng)) {
    return {
      ...input.root,
      lat: hubLat as number,
      lng: hubLng as number,
      calloutOffsetX: null,
      calloutOffsetY: null,
    };
  }
  return {
    ...input.root,
    calloutOffsetX: null,
    calloutOffsetY: null,
  };
}

export function pickBrainSurfaceSpatialTracePlaces(input: {
  root: BrainSurfaceProjectionCandidate;
  inferred: readonly BrainSurfaceProjectionCandidate[];
}): BrainSurfaceProjectionCandidate[] {
  const ranked = [...input.inferred]
    .filter(isConfidentInferredPlace)
    .filter(hasCoords)
    .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0));

  return dedupeByProximity(ranked).slice(0, MAX_TRACE_PLACES);
}

export function styleBrainSurfaceSpatialTraceMarkers(
  markers: readonly BrainSurfaceProjectionCandidate[],
  activeId: string | null,
): BrainSurfaceProjectionCandidate[] {
  return markers.map((candidate, index) => ({
    ...candidate,
    markerStyle: "trace" as const,
    calloutOffsetX: null,
    calloutOffsetY: null,
    markerThumbnailUrl: null,
    focusPriority: activeId === candidate.id ? 100 : 80 - index * 4,
    markerScale: activeId === candidate.id ? 1.12 : 1,
    markerOpacity: 1,
    zIndexBoost: activeId === candidate.id ? 6 : 4,
  }));
}

export function buildBrainSurfaceSpatialTraceArcs(input: {
  root: Pick<BrainSurfaceProjectionCandidate, "id" | "lat" | "lng">;
  places: readonly Pick<BrainSurfaceProjectionCandidate, "id" | "lat" | "lng">[];
  clusterId: string;
}): GlobeTripArc[] {
  if (!hasCoords(input.root)) {
    return [];
  }
  return input.places
    .filter(hasCoords)
    .map((place) => ({
      id: `brain-trace:${input.clusterId}:${input.root.id}:${place.id}`,
      tripRef: input.clusterId,
      startLat: input.root.lat,
      startLng: input.root.lng,
      endLat: place.lat,
      endLng: place.lng,
      color: GLOBE_TOSS_THEME.blue,
      emphasis: "focused" as const,
    }));
}

/** Flat arc lift for walk-scale brain-surface trace links. */
export function resolveBrainSurfaceTraceArcAltitude(
  arc: Pick<GlobeTripArc, "startLat" | "startLng" | "endLat" | "endLng">,
): number {
  return resolveLocalDiscoveryRouteArcAltitude(arc);
}
