import type { ProjectionDiscoveryAccent } from "@/lib/situation-projection/projection-node-presentation";
import type {
  BrainSurfaceAnchorKind,
  BrainSurfaceMarkerStyle,
  SpatialTraceItem,
} from "@/lib/situation-projection/spatial-trace-types";

export const BRAIN_SURFACE_CANDIDATE_FAMILIES = [
  "media",
  "trace_place",
  "eatery",
  "lodging",
  "info",
  "event",
  "memo",
] as const;

export type BrainSurfaceCandidateFamily =
  (typeof BRAIN_SURFACE_CANDIDATE_FAMILIES)[number];

export type BrainSurfaceMemoCommitDraft = {
  title: string;
  placeLabel: string;
  note: string;
  lat: number;
  lng: number;
};

export const BRAIN_SURFACE_EVIDENCE_KINDS = [
  "official",
  "guide",
  "video",
  "public",
  "projection",
] as const;

export type BrainSurfaceEvidenceKind =
  (typeof BRAIN_SURFACE_EVIDENCE_KINDS)[number];

export type BrainSurfaceProjectionCandidate = {
  id: string;
  eventId: string;
  nodeId: string | null;
  family: BrainSurfaceCandidateFamily;
  clusterId?: string | null;
  parentGuideNodeId?: string | null;
  anchorKind?: BrainSurfaceAnchorKind | null;
  markerStyle?: BrainSurfaceMarkerStyle | null;
  confidence?: number | null;
  confidenceLabelKo?: string | null;
  inferenceLabelKo?: string | null;
  spatialTraceItems?: readonly SpatialTraceItem[];
  focusAffinityFamilies?: readonly BrainSurfaceCandidateFamily[];
  label: string;
  previewTitle: string;
  previewBody: string | null;
  placeLabel: string;
  lat: number;
  lng: number;
  accent: ProjectionDiscoveryAccent;
  badgeLabelKo: string | null;
  relationMemoKo: string | null;
  sourceLabelKo?: string | null;
  validityLabelKo?: string | null;
  evidenceKind?: BrainSurfaceEvidenceKind | null;
  primaryActionLabelKo?: string | null;
  openUrl: string | null;
  embedUrl: string | null;
  mapsUrl: string | null;
  searchQuery: string | null;
  sourceGuideNodeId: string | null;
  revealOrder: number;
  focusPriority?: number;
  markerScale?: number;
  markerOpacity?: number;
  zIndexBoost?: number;
  /** Pixel offset from hub anchor — pill fans out, stem draws to dot. */
  calloutOffsetX?: number | null;
  calloutOffsetY?: number | null;
  markerThumbnailUrl?: string | null;
  markerMediaKind?: "image" | "video" | null;
  virtualCandidate: true;
  memoCommitDraft?: BrainSurfaceMemoCommitDraft | null;
};

export type BrainSurfaceProjectionBatch = {
  eventId: string;
  candidates: readonly BrainSurfaceProjectionCandidate[];
  createdAt: string;
  trigger: "brain_complete";
};
