/**
 * Place Action Graph — Entity → Knowledge / Explore / Actions → Reality prepare.
 * L1 UI never says Ontology / Entity / Action Graph.
 */

export const PLACE_EXPLORE_VERSION = 1 as const;

export const PLACE_EXPLORE_BRANCHES = [
  "knowledge",
  "explore",
  "actions",
] as const;

export type PlaceExploreBranch = (typeof PLACE_EXPLORE_BRANCHES)[number];

export type PlaceExploreNodeKind =
  | "knowledge"
  | "explore"
  | "action"
  | "ai_next";

export type PlaceExploreActionId =
  | "add_to_schedule"
  | "find_lodging"
  | "reserve_prep"
  | "directions"
  | "ask_ai_day"
  | "ask_ai_couple"
  | "ask_ai_quiet";

export type PlaceExploreExploreId =
  | "nearby_cafe"
  | "nearby_eatery"
  | "photo_spots"
  | "shopping"
  | "cherry_route"
  | "picnic";

export type PlaceExploreKnowledgeId =
  | "hours"
  | "crowd"
  | "cherry"
  | "history"
  | "transit";

export type PlaceExploreEntity = {
  readonly placeId: string;
  readonly titleKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly providerTags: readonly string[];
  readonly contextEventId: string | null;
  readonly contextLabelKo: string | null;
  readonly thumbnailUrl: string | null;
  readonly evidenceLineKo: string | null;
};

export type PlaceExploreGraphNode = {
  readonly id: string;
  readonly branch: PlaceExploreBranch | "ai_next";
  readonly kind: PlaceExploreNodeKind;
  readonly emoji: string;
  readonly labelKo: string;
  readonly detailKo: string | null;
  /** Explore / AI next may project onto map. */
  readonly projectable: boolean;
  readonly exploreId?: PlaceExploreExploreId;
  readonly actionId?: PlaceExploreActionId;
  readonly knowledgeId?: PlaceExploreKnowledgeId;
  readonly virtual: boolean;
};

export type PlaceExploreGraph = {
  readonly version: typeof PLACE_EXPLORE_VERSION;
  readonly entity: PlaceExploreEntity;
  readonly aiNext: readonly PlaceExploreGraphNode[];
  readonly knowledge: readonly PlaceExploreGraphNode[];
  readonly explore: readonly PlaceExploreGraphNode[];
  readonly actions: readonly PlaceExploreGraphNode[];
};

export type PlaceExploreSessionV1 = {
  readonly version: typeof PLACE_EXPLORE_VERSION;
  readonly sessionId: string;
  readonly graph: PlaceExploreGraph;
  /** Candidate ids projected onto the globe this session. */
  readonly projectedCandidateIds: readonly string[];
  readonly openedAtIso: string;
};
