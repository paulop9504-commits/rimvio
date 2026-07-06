/** Natural language → structured local discovery action (placement engine input). */

export type LocalDiscoveryResourceType = "restaurant" | "hotel";

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
};

export type LocalDiscoveryQuestionChoice = {
  readonly id: string;
  readonly label: string;
  readonly slot: "transport" | "budget" | "vibe" | "lodgingKind";
  readonly value: string;
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
  readonly kind: "lodging" | "eatery";
  readonly title: string;
  readonly reasonKo: string;
  readonly rank: number;
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
