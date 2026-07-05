import type { ContextHubServiceId } from "@/lib/ontology/context-hub-service-id";
import type { RimvioEntityId } from "@/lib/ontology/entity-types";
import type { MediaGuideCandidateSearchProfile } from "@/lib/ontology/media-guide-types";
import type { LodgingStayWindow } from "@/lib/globe/context-hub/lodging-resource-types";
import type { TravelBrainProjection } from "@/lib/situation-projection/travel-brain-personalization";

/** Experience-layer situation projection — NOT entity graph truth. */
export const SITUATION_PROJECTION_CONTRACT_VERSION = 2 as const;

export const SITUATION_PROJECTION_STORAGE_KEY =
  "rimvio.situation-projection.v1" as const;

export const SITUATION_TYPES = [
  "caregiving",
  "travel",
  "trade",
  "collab",
  "generic",
] as const;

export type SituationType = (typeof SITUATION_TYPES)[number];

export const GHOST_AXIS_IDS = [
  "schedule",
  "place",
  "flight",
  "lodging",
  "eatery",
  "info",
  "ticket",
  "transit",
  "people",
  "records",
  "insurance",
  "cost",
  "thread",
  "media",
  "packing",
  "capture",
] as const;

export type GhostAxisId = (typeof GHOST_AXIS_IDS)[number];

export const PROJECTION_SURFACE_KINDS = [
  "prep_card",
  "situation_map",
  "mind_map",
  "quiet",
] as const;

export type ProjectionSurfaceKind = (typeof PROJECTION_SURFACE_KINDS)[number];

export const PROJECTION_NODE_KINDS = ["solid", "ghost"] as const;

export type ProjectionNodeKind = (typeof PROJECTION_NODE_KINDS)[number];

export const PROJECTION_NODE_EMPHASIS = ["focus", "main", "aux"] as const;

export type ProjectionNodeEmphasis = (typeof PROJECTION_NODE_EMPHASIS)[number];

export const PROJECTION_SURFACE_PLACEMENTS = [
  "map_anchor",
  "root_branch",
] as const;

export type ProjectionSurfacePlacement =
  (typeof PROJECTION_SURFACE_PLACEMENTS)[number];

export const PROJECTION_SEMANTIC_TYPES = [
  "experience",
  "schedule",
  "place",
  "flight",
  "transit",
  "lodging",
  "eatery",
  "info",
  "ticket",
  "people",
  "records",
  "insurance",
  "cost",
  "thread",
  "media",
  "packing",
  "capture",
  "generic",
] as const;

export type ProjectionSemanticType = (typeof PROJECTION_SEMANTIC_TYPES)[number];

export const PROJECTION_ONTOLOGY_ROLES = [
  "root",
  "connected",
  "projected",
] as const;

export type ProjectionOntologyRole = (typeof PROJECTION_ONTOLOGY_ROLES)[number];

/** Committed truth anchor — always backed by event or entity graph evidence. */
export type SolidProjectionNode = {
  kind: "solid";
  id: string;
  entityId?: RimvioEntityId;
  eventId?: string;
  label: string;
  evidenceEventIds: readonly string[];
  semanticType?: ProjectionSemanticType;
  semanticTypeLabelKo?: string | null;
  ontologyRole?: ProjectionOntologyRole;
  relationLabelKo?: string | null;
  relationReasonKo?: string | null;
};

/**
 * Playbook axis — not in entity graph until user commits.
 * `virtual: true` is required on all ghost nodes.
 */
export type GhostProjectionNode = {
  kind: "ghost";
  id: string;
  axisId: GhostAxisId;
  label: string;
  virtual: true;
  /** LLM-ranked playbook axis — still virtual until commit */
  inferred?: boolean;
  /** Optional @ feature when registry lists it */
  featureId?: string | null;
  playbookReasonKo?: string;
  /** Knowledge container label e.g. 보험서류함 */
  knowledgeBoxLabel?: string | null;
  /** Optional direct action for overlay nodes. */
  actionKind?: "hub_service" | "context_run" | null;
  hubServiceId?: ContextHubServiceId | null;
  href?: string | null;
  internalRoute?: boolean;
  searchQuery?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
  stayWindow?: LodgingStayWindow | null;
  emphasis?: ProjectionNodeEmphasis;
  surfacePlacement?: ProjectionSurfacePlacement;
  semanticType?: ProjectionSemanticType;
  semanticTypeLabelKo?: string | null;
  ontologyRole?: ProjectionOntologyRole;
  relationLabelKo?: string | null;
  relationReasonKo?: string | null;
  candidateOrigin?: "media_inferred" | "lodging_agent" | null;
  candidateBadgeKo?: string | null;
  candidateConfidence?: number | null;
  sourceGuideNodeId?: string | null;
  sourceGuideTitle?: string | null;
  sourceGuideUrl?: string | null;
  sourceGuideSnippetKo?: string | null;
  candidateSearchProfile?: MediaGuideCandidateSearchProfile | null;
  situationalHintsKo?: readonly string[];
  cuisineHint?: string | null;
  /** Place-backed ghost — hero image for map marker. */
  previewImageUrl?: string | null;
  rating?: number | null;
};

export type ProjectionNode = SolidProjectionNode | GhostProjectionNode;

/** UI-only adjacency — never persisted to rimvio.entity-graph.v1 */
export type ProjectionLink = {
  id: string;
  fromId: string;
  toId: string;
  virtual: boolean;
  reason?: "playbook" | "solid_neighbor" | "ai_layout" | "user_promoted";
  relationLabelKo?: string | null;
  relationReasonKo?: string | null;
  /** dashed = ghost; solid = committed or strong evidence */
  strokeStyle?: "dashed" | "solid";
  /** 1–100 — thicker when promoted / more evidence */
  weight?: number;
};

export const HUB_PILL_ACTION_KINDS = [
  "hub_service",
  "knowledge_capture",
  "context_run",
  "coming_soon",
] as const;

export type HubPillActionKind = (typeof HUB_PILL_ACTION_KINDS)[number];

/** Hub capability entry on context card / mind map — projection only until execute. */
export type HubRunnablePill = {
  id: string;
  labelKo: string;
  shortLabelKo: string;
  kind: "solid" | "ghost";
  virtual: boolean;
  hubServiceId?: ContextHubServiceId | null;
  ghostAxisId?: GhostAxisId | null;
  linkedNodeId?: string | null;
  actionKind: HubPillActionKind;
  /** Populated for hub_service when infrastructure exists */
  href?: string | null;
  searchQuery?: string | null;
  internalRoute?: boolean;
  implemented: boolean;
  priority: number;
  inferred?: boolean;
  emphasis?: ProjectionNodeEmphasis | null;
  semanticType?: ProjectionSemanticType | null;
  semanticTypeLabelKo?: string | null;
  relationLabelKo?: string | null;
  relationReasonKo?: string | null;
};

export type SituationProjectionTrigger = {
  source: "calendar" | "notification" | "chat" | "link" | "recall" | "manual";
  sourceRef?: string | null;
  atIso: string;
};

export type MindMapNodeLayout = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MindMapLayout = {
  width: number;
  height: number;
  nodes: readonly MindMapNodeLayout[];
};

export type SituationProjectionManifest = {
  version: typeof SITUATION_PROJECTION_CONTRACT_VERSION;
  manifestId: string;
  situationType: SituationType;
  anchorEventId: string;
  trigger: SituationProjectionTrigger;
  surfaceKind: ProjectionSurfaceKind;
  nodes: readonly ProjectionNode[];
  links: readonly ProjectionLink[];
  /** Context card + mind-map Hub pills (max 4 enforced at compose) */
  pills: readonly HubRunnablePill[];
  composedAt: string;
  /** When true, manifest must not be merged into entity graph stores */
  readOnly: true;
  layoutSource?: "deterministic" | "llm";
  /** Pixel layout for mind_map / situation_map surfaces */
  mindMapLayout?: MindMapLayout;
  /** Travel Brain projection state + reduced clarification prompts. */
  travelBrain?: TravelBrainProjection | null;
};

export const EMPTY_SITUATION_PROJECTION_MANIFEST: SituationProjectionManifest = {
  version: SITUATION_PROJECTION_CONTRACT_VERSION,
  manifestId: "empty",
  situationType: "generic",
  anchorEventId: "",
  trigger: { source: "manual", atIso: new Date(0).toISOString() },
  surfaceKind: "quiet",
  nodes: [],
  links: [],
  pills: [],
  composedAt: new Date(0).toISOString(),
  readOnly: true,
  layoutSource: "deterministic",
  travelBrain: null,
};

export function isGhostProjectionNode(
  node: ProjectionNode,
): node is GhostProjectionNode {
  return node.kind === "ghost" && node.virtual === true;
}

export function isSolidProjectionNode(
  node: ProjectionNode,
): node is SolidProjectionNode {
  return node.kind === "solid";
}
