/**
 * Rimvio Projection Engine — Intent → Ontology → Globe Projection (read-only).
 * Never owns truth. Never auto-Commits. Chat is secondary; Projection is primary.
 */

export const PROJECTION_ENGINE_VERSION = 1 as const;

/** Pipeline stages — Cursor-style progress; stops before Reality Commit. */
export const PROJECTION_STAGES = [
  "UNDERSTAND_INTENT",
  "GENERATE_PROJECT",
  "GENERATE_ONTOLOGY",
  "GENERATE_RELATIONS",
  "SEARCH",
  "PROJECT_GLOBE",
  "CLUSTER",
  "SUGGEST_TASKS",
  "WAIT_COMMIT",
] as const;

export type ProjectionStage = (typeof PROJECTION_STAGES)[number];

export type ProjectionProjectKind =
  | "travel"
  | "eat"
  | "purchase"
  | "date"
  | "job"
  | "move"
  | "generic";

export type ProjectionNodeKind =
  | "Person"
  | "Place"
  | "Restaurant"
  | "Hotel"
  | "Flight"
  | "Schedule"
  | "Event"
  | "Idea"
  | "Document"
  | "Task"
  | "Product"
  | "Vehicle"
  | "Weather"
  | "Budget"
  | "Media"
  | "Note"
  | "Question"
  | "Memory";

export type ProjectionRelationKind =
  | "located_in"
  | "near"
  | "arrives_before"
  | "part_of"
  | "needs"
  | "related_to";

export type ProjectionClusterKind =
  | "food"
  | "shopping"
  | "transportation"
  | "hotel"
  | "night_view"
  | "history"
  | "generic";

export type SuggestedTaskVerb =
  | "reserve"
  | "compare"
  | "call"
  | "buy"
  | "save"
  | "navigate"
  | "share"
  | "bookmark";

export type ProjectionOntologyNode = {
  readonly id: string;
  readonly kind: ProjectionNodeKind;
  readonly labelKo: string;
  readonly confidence: number;
};

export type ProjectionOntologyRelation = {
  readonly id: string;
  readonly kind: ProjectionRelationKind;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly labelKo?: string;
};

export type ProjectedGlobeEntity = {
  readonly id: string;
  readonly nodeId: string;
  readonly type: ProjectionNodeKind;
  readonly labelKo: string;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly confidence: number;
  readonly source: string;
  readonly relation: ProjectionRelationKind | null;
  readonly distanceM: number | null;
  readonly score: number | null;
};

export type ProjectionCluster = {
  readonly id: string;
  readonly kind: ProjectionClusterKind;
  readonly labelKo: string;
  readonly entityIds: readonly string[];
};

export type SuggestedProjectionTask = {
  readonly id: string;
  readonly verb: SuggestedTaskVerb;
  readonly labelKo: string;
  readonly targetNodeId: string | null;
};

/** Approval-gated only — never auto-execute. */
export type ProjectionCommitCandidate = {
  readonly id: string;
  readonly type: string;
  readonly previewKo: string;
  readonly needsApproval: true;
  readonly status: "pending";
};

export type RealityProjection = {
  readonly version: typeof PROJECTION_ENGINE_VERSION;
  readonly utterance: string;
  readonly goal: {
    readonly summaryKo: string;
    readonly kind: ProjectionProjectKind;
    readonly confidence: number;
  };
  readonly project: {
    readonly id: string;
    readonly titleKo: string;
    readonly kind: ProjectionProjectKind;
  };
  readonly ontology: {
    readonly nodes: readonly ProjectionOntologyNode[];
    readonly relations: readonly ProjectionOntologyRelation[];
  };
  /** Discovered entities on Globe — empty until Search fills them. */
  readonly projection: {
    readonly entities: readonly ProjectedGlobeEntity[];
  };
  readonly clusters: readonly ProjectionCluster[];
  readonly suggestedTasks: readonly SuggestedProjectionTask[];
  readonly commitCandidates: readonly ProjectionCommitCandidate[];
  /** Active pipeline cursor — never past WAIT_COMMIT without human. */
  readonly stage: ProjectionStage;
};
