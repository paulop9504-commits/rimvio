/** Natural language → structured local discovery action (placement engine input). */

export type LocalDiscoveryResourceType =
  | "restaurant"
  | "hotel"
  | "activity"
  | "amenity";

export type LocalDiscoveryTransport = "walk" | "car" | "transit";

export type LocalDiscoveryBudget = "low" | "medium" | "high";

export type LocalDiscoveryVibe = "quiet" | "popular" | "local" | "hot";

export type LocalDiscoveryLodgingKind = "hotel" | "airbnb" | "any";

export type LocalDiscoveryActionSpec = {
  readonly version: 1;
  readonly resourceTypes: readonly LocalDiscoveryResourceType[];
  readonly transport: LocalDiscoveryTransport;
  readonly budget: LocalDiscoveryBudget;
  readonly vibe: LocalDiscoveryVibe;
  readonly lodgingKind: LocalDiscoveryLodgingKind;
  /** Search radius in meters — derived from transport. */
  readonly radiusM: number;
  /** Eatery cuisine focus — e.g. 피자, 스시 (from menu disambiguation). */
  readonly eateryFocus?: string | null;
  /** Activity focus query — e.g. "실내 액티비티", "유니버설 스튜디오" (from clarify chip). */
  readonly activityFocus?: string | null;
  /**
   * Activity node cluster — the answer as a *trigger* that activates related
   * nodes (도파민 → 테마파크·놀이공원·포토스팟·야경). Retrieval multi-queries these
   * and merges into one reconstructed context, instead of a single keyword.
   */
  readonly activityCluster?: readonly string[] | null;
};

export type LocalDiscoveryQuestionChoice = {
  readonly id: string;
  readonly label: string;
  readonly slot:
    | "transport"
    | "budget"
    | "vibe"
    | "lodgingKind"
    | "menuFocus"
    | "resourceFocus"
    | "activityFocus"
    | "activityCluster";
  readonly value: string;
  /** Related nodes this choice activates (trigger → cluster). Multi-query source. */
  readonly cluster?: readonly string[];
};

export type LocalDiscoveryQuestion = {
  readonly slot: LocalDiscoveryQuestionChoice["slot"];
  readonly promptKo: string;
  readonly choices: readonly LocalDiscoveryQuestionChoice[];
};

export type LocalDiscoveryPendingAnswers = Partial<
  Record<LocalDiscoveryQuestionChoice["slot"], string>
>;

export type ResolveLocalDiscoveryActionInput = {
  message: string;
  answers?: LocalDiscoveryPendingAnswers | null;
  /** Travel-brain slot confidence — skip questions when >= threshold. */
  mobilityConfidence?: number;
  budgetConfidence?: number;
  foodConfidence?: number;
  lodgingConfidence?: number;
  inferredTransport?: LocalDiscoveryTransport | null;
  inferredBudget?: LocalDiscoveryBudget | null;
  inferredVibe?: LocalDiscoveryVibe | null;
  inferredLodgingKind?: LocalDiscoveryLodgingKind | null;
  wantsLodging?: boolean;
  wantsEatery?: boolean;
  /** Prior scout in this session — inherit transport/budget on follow-up. */
  previousSpec?: LocalDiscoveryActionSpec | null;
  followUpTurn?: boolean;
};

export type ResolveLocalDiscoveryActionResult =
  | {
      readonly status: "questions";
      readonly questions: readonly LocalDiscoveryQuestion[];
      readonly answers: LocalDiscoveryPendingAnswers;
      readonly partial: Partial<LocalDiscoveryActionSpec>;
    }
  | {
      readonly status: "ready";
      readonly spec: LocalDiscoveryActionSpec;
      readonly answers: LocalDiscoveryPendingAnswers;
    };

export type ContextConditionRecommendation = {
  readonly kind: "lodging" | "eatery" | "activity" | "amenity";
  readonly title: string;
  readonly reasonKo: string;
  readonly rank: number;
  readonly placeId: string;
  readonly lat: number;
  readonly lng: number;
};

export type ContextConditionAnchorPinOutcome = {
  batchId: string;
  lodgingCount: number;
  eateryCount: number;
  summaryKo: string;
  pinPoints: readonly { lat: number; lng: number }[];
  radiusM: number;
  recommendations: readonly ContextConditionRecommendation[];
  spec: LocalDiscoveryActionSpec;
};
