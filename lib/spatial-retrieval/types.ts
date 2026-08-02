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

export const SPATIAL_RELATIONS = [
  "nearby",
  "route",
  "within",
] as const;

export type SpatialRelation = (typeof SPATIAL_RELATIONS)[number];

export type SpatialDiscoveryConstraints = {
  readonly distance: number | null;
  readonly walkingTime: number | null;
  readonly category: string | null;
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

export type SpatialQuerySpec = {
  readonly targetEntity: SpatialTargetEntity;
  readonly relation: SpatialRelation;
  readonly anchor: SpatialAnchorResolved;
  readonly constraints: SpatialDiscoveryConstraints;
  readonly center: { readonly lat: number; readonly lng: number } | null;
  readonly radiusMeters: number;
};

export type SpatialRetrievedEntity = {
  readonly entityId: string;
  readonly titleKo: string;
  readonly kind: SpatialTargetEntity;
  readonly lat: number;
  readonly lng: number;
  readonly metersFromAnchor: number | null;
  readonly walkMinutes: number | null;
};

export type SpatialRelationEdge = {
  readonly id: string;
  readonly fromId: string;
  readonly toId: string;
  readonly relation: SpatialRelation;
  readonly meters: number | null;
  readonly walkMinutes: number | null;
};

export type SpatialProjectionPin = {
  readonly entityId: string;
  readonly titleKo: string;
  readonly kind: string;
  readonly lat: number;
  readonly lng: number;
  readonly role: "anchor" | "discovered";
};

export type SpatialCalloutSeed = {
  readonly entityId: string;
  readonly mode: "Discover";
  readonly titleKo: string;
  readonly whyLinesKo: readonly string[];
};

export type SpatialRetrievalStage =
  | "intent"
  | "context"
  | "anchor"
  | "query"
  | "retrieval"
  | "relations"
  | "projection"
  | "callout";

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
      readonly entities: readonly SpatialRetrievedEntity[];
      readonly relations: readonly SpatialRelationEdge[];
      readonly pins: readonly SpatialProjectionPin[];
      readonly callouts: readonly SpatialCalloutSeed[];
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
