/** Projection-only spatial trace derived from media guides — never truth writes. */

export const SPATIAL_TRACE_KINDS = [
  "place",
  "time",
  "food",
  "movement",
  "photo",
  "mood",
] as const;

export type SpatialTraceKind = (typeof SPATIAL_TRACE_KINDS)[number];

export type SpatialTraceItem = {
  id: string;
  kind: SpatialTraceKind;
  labelKo: string;
  detailKo: string | null;
  confidence: number | null;
  confidenceLabelKo: string | null;
  inferenceLabelKo: string | null;
  lat: number | null;
  lng: number | null;
  mapsUrl: string | null;
};

export const BRAIN_SURFACE_ANCHOR_KINDS = [
  "video_root",
  "inferred_place",
  "recorded_place",
  "trace_signal",
] as const;

export type BrainSurfaceAnchorKind =
  (typeof BRAIN_SURFACE_ANCHOR_KINDS)[number];

export const BRAIN_SURFACE_MARKER_STYLES = ["solid", "dashed", "story", "trace"] as const;

export type BrainSurfaceMarkerStyle =
  (typeof BRAIN_SURFACE_MARKER_STYLES)[number];
