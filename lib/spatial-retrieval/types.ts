/**
 * Spatial Retrieval Pipeline — types
 *
 * User NL → SPATIAL_DISCOVERY Intent → Anchor → Query → Entities → Relations → Projection → Callout
 */

export const SPATIAL_DISCOVERY_TYPE = "SPATIAL_DISCOVERY" as const;

export const SPATIAL_TARGET_ENTITIES = [
  "restaurant",
  "cafe",
  "hotel",
  "attraction",
  "amenity",
] as const;

export type SpatialTargetEntity = (typeof SPATIAL_TARGET_ENTITIES)[number];

export const SPATIAL_ANCHOR_ENTITIES = [
  "hotel",
  "attraction",
  "station",
  "user_location",
  "place",
] as const;

export type SpatialAnchorEntity = (typeof SPATIAL_ANCHOR_ENTITIES)[number];

/**
 * Supported spatial relations (Query Engine).
 * Nearby · Walking Distance · Route Along · Same Area · Inside
 */
export const SPATIAL_RELATIONS = [
  "nearby",
  "walking_distance",
  "route_along",
  "same_area",
  "inside",
] as const;

export type SpatialRelation = (typeof SPATIAL_RELATIONS)[number];

/** Ranking axes declared on Spatial Query (not distance-only). */
export const SPATIAL_QUERY_RANKING = [
  "distance",
  "rating",
  "contextFit",
] as const;

export type SpatialQueryRankingAxis = (typeof SPATIAL_QUERY_RANKING)[number];

/**
 * Context Score weights — Restaurant example:
 * distance 40% · rating 20% · budgetFit 20% · scheduleFit 20%
 */
export const SPATIAL_CONTEXT_SCORE_WEIGHTS = {
  distance: 0.4,
  rating: 0.2,
  budgetFit: 0.2,
  scheduleFit: 0.2,
} as const;

export type SpatialDiscoveryConstraints = {
  readonly distance: number | null;
  readonly walkingTime: number | null;
  readonly category: string | null;
  /** Optional budget band for contextFit (e.g. "mid") */
  readonly budgetBand?: string | null;
  /** Optional schedule window hint (e.g. "lunch") */
  readonly scheduleWindow?: string | null;
};

/**
 * Intent Schema — SPATIAL_DISCOVERY
 *
 * "호텔 근처 맛집 찾아줘" →
 * { type, targetEntity:"restaurant", anchorEntity:"hotel", relation:"nearby", constraints }
 */
export type SpatialDiscoveryIntent = {
  readonly type: typeof SPATIAL_DISCOVERY_TYPE;
  readonly targetEntity: SpatialTargetEntity;
  readonly anchorEntity: SpatialAnchorEntity;
  readonly relation: SpatialRelation;
  readonly constraints: SpatialDiscoveryConstraints;
  readonly rawText: string;
};

export type SpatialContextRef = {
  readonly workspaceId: string;
  readonly contextId: string;
  readonly titleKo: string;
};

export type SpatialAnchorResolved = {
  readonly entityId: string;
  readonly titleKo: string;
  /** Display label for logs — e.g. "Namba Hotel" */
  readonly labelKo: string;
  readonly kind: SpatialAnchorEntity;
  readonly lat: number | null;
  readonly lng: number | null;
};

/**
 * Entity Resolver wire result (product schema).
 *
 * {
 *   anchorId:"hotel_123",
 *   type:"hotel",
 *   location:{ lat, lng },
 *   contextId:"osaka_trip"
 * }
 */
export type SpatialEntityResolverResult = {
  readonly anchorId: string;
  readonly type: SpatialAnchorEntity;
  readonly location: {
    readonly lat: number | null;
    readonly lng: number | null;
  };
  readonly contextId: string;
};

/** How the anchor was chosen — priority order. */
export type SpatialAnchorResolveSource =
  | "selected"
  | "context_anchor"
  | "recent_interaction"
  | "nl_match"
  | "fallback_seed";

export type SpatialAnchorCandidateProjection = {
  readonly entityId: string;
  readonly titleKo: string;
  readonly type: string;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly pinRole: "anchor_candidate";
};

export type SpatialAnchorResolveOk = {
  readonly ok: true;
  readonly anchor: SpatialAnchorResolved;
  readonly resolver: SpatialEntityResolverResult;
  readonly source: SpatialAnchorResolveSource;
};

/**
 * Ambiguous / missing — never ask "어느 호텔?".
 * Project up to 3 candidates instead.
 */
export type SpatialAnchorResolveAmbiguous = {
  readonly ok: false;
  readonly reason: "ambiguous" | "not_found";
  readonly candidates: readonly SpatialAnchorCandidateProjection[];
  readonly askUser: false;
};

/**
 * Spatial Query Engine output.
 *
 * {
 *   center: { lat, lng },
 *   radius: 1000,
 *   category: "restaurant",
 *   ranking: ["distance", "rating", "contextFit"]
 * }
 */
export type SpatialQueryEngineOutput = {
  readonly center: { readonly lat: number; readonly lng: number } | null;
  readonly radius: number;
  readonly category: string;
  readonly ranking: readonly SpatialQueryRankingAxis[];
  readonly relation: SpatialRelation;
};

export type SpatialQuerySpec = {
  readonly targetEntity: SpatialTargetEntity;
  readonly relation: SpatialRelation;
  readonly anchor: SpatialAnchorResolved;
  readonly constraints: SpatialDiscoveryConstraints;
  readonly center: { readonly lat: number; readonly lng: number } | null;
  /** @deprecated prefer radius — kept for pipeline callers */
  readonly radiusMeters: number;
  readonly radius: number;
  readonly category: string;
  readonly ranking: readonly SpatialQueryRankingAxis[];
  /** Product wire shape */
  readonly engine: SpatialQueryEngineOutput;
};

export type SpatialContextScoreBreakdown = {
  readonly distance: number;
  readonly rating: number;
  readonly budgetFit: number;
  readonly scheduleFit: number;
  /** Weighted total 0..1 */
  readonly total: number;
};

export type SpatialRetrievedEntity = {
  readonly entityId: string;
  readonly titleKo: string;
  readonly kind: SpatialTargetEntity;
  readonly lat: number;
  readonly lng: number;
  readonly metersFromAnchor: number | null;
  readonly walkMinutes: number | null;
  readonly rating?: number | null;
  readonly budgetBand?: string | null;
  readonly scheduleTags?: readonly string[];
  readonly contextScore?: SpatialContextScoreBreakdown;
};

/**
 * Reality Entity — not a flat POI list row.
 * { id, type, location, attributes, contextLinks:[] }
 */
export type SpatialRealityEntity = {
  readonly id: string;
  readonly type: string;
  readonly location: {
    readonly lat: number | null;
    readonly lng: number | null;
  };
  readonly attributes: {
    readonly titleKo: string;
    readonly rating?: number | null;
    readonly budgetBand?: string | null;
    readonly scheduleTags?: readonly string[];
    readonly contextScore?: number;
  };
  readonly contextLinks: readonly string[];
};

/**
 * Reality Relationship edge.
 * { from, to, type, metadata: { distance, walkingTime } }
 */
export type SpatialRealityRelationship = {
  readonly from: string;
  readonly to: string;
  readonly type: SpatialRelation;
  readonly metadata: {
    readonly distance: number | null;
    readonly walkingTime: number | null;
  };
};

export type SpatialRelationEdge = {
  readonly id: string;
  readonly fromId: string;
  readonly toId: string;
  readonly relation: SpatialRelation;
  readonly meters: number | null;
  readonly walkMinutes: number | null;
  /** Product wire shape */
  readonly reality: SpatialRealityRelationship;
};

/**
 * Workspace auto-update pipeline:
 * Entity Created → Projection Event → Map Update → Marker → Relationship Layer → Callout
 */
export const SPATIAL_PROJECTION_PIPELINE = [
  "entity_created",
  "projection_event",
  "map_update",
  "marker_created",
  "relationship_layer_update",
  "callout_created",
] as const;

export type SpatialProjectionPipelineStage =
  (typeof SPATIAL_PROJECTION_PIPELINE)[number];

export type SpatialProjectionEvent = {
  readonly stage: SpatialProjectionPipelineStage;
  readonly entityId: string | null;
  readonly message: string;
};

export type SpatialProjectionPin = {
  readonly entityId: string;
  readonly titleKo: string;
  readonly kind: string;
  readonly lat: number;
  readonly lng: number;
  readonly role: "anchor" | "discovered";
};

/** Evidence row inside Context Aware Callout */
export type SpatialCalloutEvidence = {
  readonly id: string;
  readonly kind:
    | "hotel_relation"
    | "distance"
    | "walking"
    | "why"
    | "metric";
  readonly labelKo: string;
  readonly valueKo: string;
  /** Why bullets use checkmark presentation */
  readonly checked?: boolean;
};

/** Relationship row shown on Callout (Hotel Relation …) */
export type SpatialCalloutRelationship = {
  readonly fromId: string;
  readonly toId: string;
  readonly type: SpatialRelation;
  readonly labelKo: string;
  readonly anchorTitleKo: string;
  readonly distanceMeters: number | null;
  readonly walkingMinutes: number | null;
};

export type SpatialCalloutActionId =
  | "add_to_schedule"
  | "compare"
  | "prepare_reservation";

export type SpatialCalloutAction = {
  readonly id: SpatialCalloutActionId;
  readonly labelKo: string;
  readonly enabled: boolean;
  readonly primary: boolean;
};

/**
 * Context Aware Callout — replaces flat Restaurant Card.
 *
 * {
 *   entityId,
 *   mode: "discovery",
 *   evidence[],
 *   relationships[],
 *   actions[]
 * }
 */
export type SpatialContextAwareCallout = {
  readonly entityId: string;
  readonly mode: "discovery";
  readonly titleKo: string;
  readonly emoji: string;
  readonly evidence: readonly SpatialCalloutEvidence[];
  readonly relationships: readonly SpatialCalloutRelationship[];
  readonly actions: readonly SpatialCalloutAction[];
  /** Display lines for WHY (✓ …) */
  readonly whyLinesKo: readonly string[];
};

/** @deprecated use SpatialContextAwareCallout — kept as alias for older seeds */
export type SpatialCalloutSeed = SpatialContextAwareCallout;

/**
 * Draft Edge — schedule add before Reality Commit.
 * "여기 일정에 넣어" → draft only; Commit 전 상태 유지.
 */
export type SpatialDraftEdge = {
  readonly id: string;
  readonly fromEntityId: string;
  readonly toEntityId: string;
  readonly kind: "schedule_add";
  readonly status: "draft";
  readonly committed: false;
  readonly labelKo: string;
  readonly createdAtIso: string;
};

export type SpatialRetrievalStage =
  | "intent"
  | "context"
  | "anchor"
  | "query"
  | "retrieval"
  | "relations"
  | "projection"
  | "callout"
  | "reality_graph"
  | "draft";

export type SpatialRetrievalLogLine = {
  readonly stage: SpatialRetrievalStage;
  readonly message: string;
};

export type SpatialRetrievalInput = {
  readonly text: string;
  readonly workspaceId: string;
  readonly contextTitleKo?: string | null;
  /** Candidate anchors in current Workspace (hotels, POIs, …) */
  readonly candidates?: readonly {
    readonly entityId: string;
    readonly titleKo: string;
    readonly kind: string;
    readonly lat?: number | null;
    readonly lng?: number | null;
    readonly selected?: boolean;
    /** Context-level trip anchor (e.g. primary lodging) */
    readonly contextAnchor?: boolean;
    /** Recently interacted / focused in Workspace */
    readonly recentInteraction?: boolean;
  }[];
  /** Emit stage logs (default true) */
  readonly log?: boolean;
};

export type SpatialRetrievalResult =
  | {
      readonly ok: true;
      readonly intent: SpatialDiscoveryIntent;
      readonly context: SpatialContextRef;
      readonly anchor: SpatialAnchorResolved;
      readonly resolver: SpatialEntityResolverResult;
      readonly query: SpatialQuerySpec;
      /** Ranked retrieval hits (Context Score — not distance-only) */
      readonly entities: readonly SpatialRetrievedEntity[];
      /** Reality Graph nodes (anchor + discovered) */
      readonly realityEntities: readonly SpatialRealityEntity[];
      readonly relations: readonly SpatialRelationEdge[];
      /** Reality Graph edges (from/to/type/metadata) */
      readonly realityRelationships: readonly SpatialRealityRelationship[];
      readonly pins: readonly SpatialProjectionPin[];
      /** Context Aware Callouts (not Restaurant Cards) */
      readonly callouts: readonly SpatialContextAwareCallout[];
      /** Workspace auto-update event stream */
      readonly projectionEvents: readonly SpatialProjectionEvent[];
      readonly logs: readonly SpatialRetrievalLogLine[];
      readonly summaryKo: string;
    }
  | {
      readonly ok: false;
      readonly reasonKo: string;
      readonly stage: SpatialRetrievalStage;
      readonly logs: readonly SpatialRetrievalLogLine[];
      readonly intent: SpatialDiscoveryIntent | null;
      /**
       * Anchor ambiguous — project candidates (never chat-ask).
       * askUser is always false.
       */
      readonly anchorCandidates?: readonly SpatialAnchorCandidateProjection[];
      readonly askUser?: false;
    };
