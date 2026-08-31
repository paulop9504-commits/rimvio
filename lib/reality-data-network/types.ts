/**
 * Reality Data Network — SSOT types (R1).
 */

export type RealityTaskType =
  | "photo_authenticity"
  | "room_type_label"
  | "attribute_verify"
  | "complex_verification"
  | "expert_review";

export type RealityTaskStatus =
  | "open"
  | "in_review"
  | "consensus"
  | "resolved"
  | "disputed";

export type EpistemicLevel = "suggested" | "inferred" | "observed" | "confirmed";

export type RealityTaskOption = {
  readonly id: string;
  readonly labelKo: string;
};

export type RealityTask = {
  readonly taskId: string;
  readonly taskType: RealityTaskType;
  readonly titleKo: string;
  readonly targetLabelKo: string;
  readonly domain: "lodging" | "eatery" | "poi" | "general";
  readonly aiPreLabel?: Readonly<Record<string, unknown>>;
  readonly suggestedPatch?: SuggestedRealityPatch | null;
  readonly options: readonly RealityTaskOption[];
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly baseRewardKrw: number;
  readonly requiredVerifiers: number;
  readonly consensusThreshold: number;
  readonly status: RealityTaskStatus;
  readonly supplierId: string;
  readonly supplierLabel: string;
  readonly submittedAt: string;
  readonly mediaUrl?: string | null;
  readonly targetRef?: string | null;
  readonly contextEventId?: string | null;
  readonly consensusConfidence?: number | null;
  readonly consensusVerdict?: string | null;
  readonly spawnReason?: string | null;
};

export type VerifierResponse = {
  readonly responseId: string;
  readonly taskId: string;
  readonly verifierId: string;
  readonly answerId: string;
  readonly answerLabelKo: string;
  readonly at: string;
  readonly latencyMs: number;
};

export type ConsensusResult = {
  readonly taskId: string;
  readonly verdict: string | null;
  readonly confidence: number;
  readonly agreementRate: number;
  readonly status: "pending" | "resolved" | "disputed";
  readonly responseCount: number;
  readonly requiredVerifiers: number;
  readonly responses: readonly VerifierResponse[];
};

export type SuggestedRealityPatch = {
  readonly epistemic: "suggested" | "inferred";
  readonly domain: RealityTask["domain"];
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly source: "vision" | "ocr" | "heuristic";
  readonly confidence: number;
  readonly summaryKo?: string | null;
};

export type DataSubmission = {
  readonly submissionId: string;
  readonly supplierId: string;
  readonly titleKo: string;
  readonly domain: RealityTask["domain"];
  readonly taskType: RealityTaskType;
  readonly status: "pending" | "in_review" | "verified" | "rejected" | "disputed";
  readonly taskId?: string | null;
  readonly submittedAt: string;
  readonly epistemic: EpistemicLevel;
  readonly targetRef?: string | null;
};

export type ContributorRole =
  | "supplier"
  | "verifier"
  | "capability_developer"
  | "domain_expert"
  | "business";

export type BusinessSupplyKind =
  | "inventory"
  | "price"
  | "policy"
  | "photos"
  | "hours";

export type BusinessSupplyRecord = {
  readonly supplyId: string;
  readonly businessId: string;
  readonly businessLabel: string;
  readonly domain: RealityTask["domain"];
  readonly kind: BusinessSupplyKind;
  readonly targetLabelKo: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: "pending" | "verified" | "rejected";
  readonly submittedAt: string;
  readonly epistemic: EpistemicLevel;
};

export type ContributorProfile = {
  readonly contributorId: string;
  readonly displayName: string;
  readonly roles: readonly ContributorRole[];
  readonly accuracyPct: number;
  readonly reliabilityTier: "new" | "regular" | "expert";
  readonly qualityMultiplier: number;
  readonly totalEarnedKrw: number;
  readonly tasksCompleted: number;
  readonly verifierAppliedAt?: string | null;
  readonly verifierApproved: boolean;
};

export const REALITY_TASK_TYPE_META: Record<
  RealityTaskType,
  { readonly labelKo: string; readonly baseRewardKrw: number; readonly difficulty: 1 | 2 | 3 | 4 | 5 }
> = {
  photo_authenticity: { labelKo: "사진 진위 검수", baseRewardKrw: 10, difficulty: 2 },
  room_type_label: { labelKo: "객실 타입 라벨링", baseRewardKrw: 20, difficulty: 2 },
  attribute_verify: { labelKo: "속성 검수", baseRewardKrw: 30, difficulty: 3 },
  complex_verification: { labelKo: "고난도 검증", baseRewardKrw: 100, difficulty: 4 },
  expert_review: { labelKo: "전문가 검수", baseRewardKrw: 300, difficulty: 5 },
};

export const DEFAULT_CONSENSUS_VERIFIERS = 3;
export const DEFAULT_CONSENSUS_THRESHOLD = 0.67;

export const DEFAULT_YES_NO_OPTIONS: readonly RealityTaskOption[] = [
  { id: "yes", labelKo: "YES — 맞음" },
  { id: "no", labelKo: "NO — 틀림" },
  { id: "unclear", labelKo: "판단 불가" },
];
