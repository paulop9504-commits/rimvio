/**
 * Trust Pipeline — anyone may submit; nothing executes until promoted.
 * PASS = eligibility for the next stage, never a production deploy grant.
 */

import type { CertificationLevel } from "@/lib/hub/standards/types";

export const TRUST_LANE_STAGES = [
  "submission",
  "quarantine",
  "automated_guard",
  "sandbox",
  "human_review",
  "tested",
  "verified",
  "staging",
  "canary",
  "production",
] as const;

export type TrustLaneStage = (typeof TRUST_LANE_STAGES)[number];

export const GUARD_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type GuardSeverity = (typeof GUARD_SEVERITIES)[number];

export const CAPABILITY_PERMISSION_LEVELS = [0, 1, 2, 3, 4, 5] as const;
export type CapabilityPermissionLevel = (typeof CAPABILITY_PERMISSION_LEVELS)[number];

export type CapabilityPermissionSpec = {
  readonly level: CapabilityPermissionLevel;
  readonly id: string;
  readonly titleKo: string;
  readonly descriptionKo: string;
};

export type GuardFinding = {
  readonly id: string;
  readonly scanner: string;
  readonly severity: GuardSeverity;
  readonly messageKo: string;
  readonly evidence?: string;
};

export type GuardScanResult = {
  readonly passed: boolean;
  readonly blocked: boolean;
  readonly findings: readonly GuardFinding[];
  readonly nextStage: TrustLaneStage | null;
};

export type SandboxPolicy = {
  readonly ephemeral: true;
  readonly maxCpuMs: number;
  readonly maxMemoryMb: number;
  readonly maxWallMs: number;
  readonly network: "deny";
  readonly filesystem: "scratch_only";
  readonly secrets: "zero";
  readonly productionDb: false;
};

export type ReviewerVote = "PASS" | "FAIL" | "SUSPICIOUS";

export type HumanReviewBallot = {
  readonly reviewerId: string;
  readonly vote: ReviewerVote;
};

export type HumanReviewConsensus = {
  readonly decision: "PASS" | "FAIL" | "HUMAN_REVIEW_REQUIRED";
  readonly eligibleForNextStage: boolean;
  readonly productionAllowed: false;
  readonly reasonKo: string;
};

export type TrustPromotionDecision = {
  readonly from: TrustLaneStage;
  readonly to: TrustLaneStage | null;
  readonly allowed: boolean;
  readonly reasonKo: string;
};

export type CapabilityCallNode = {
  readonly capabilityId: string;
  readonly trust: CertificationLevel;
  readonly permissionLevel: CapabilityPermissionLevel;
};

export type CapabilityCallGateResult = {
  readonly allowed: boolean;
  readonly reasonKo: string;
};

export type ProducerReputation = {
  readonly producerId: string;
  readonly verifiedCapabilities: number;
  readonly reviewSuccessPct: number;
  readonly securityIncidents: number;
  readonly rollbacks: number;
  readonly userSuccessPct: number;
};

export type CapabilityReputation = {
  readonly capabilityId: string;
  readonly verification: CertificationLevel;
  readonly successRatePct: number;
  readonly humanScore: number;
  readonly usage: number;
  readonly failureRatePct: number;
  readonly security: "PASS" | "FAIL";
};

export type TrustSubmissionInput = {
  readonly capabilityId: string;
  readonly producerId: string;
  readonly source: string;
  readonly dependencies?: readonly string[];
  readonly declaredPermissionLevel?: CapabilityPermissionLevel;
  readonly reviewerIds?: readonly string[];
};

export type TrustSubmissionResult = {
  readonly stage: TrustLaneStage;
  readonly quarantined: boolean;
  readonly executable: false;
  readonly productionAllowed: false;
  readonly permissionLevel: CapabilityPermissionLevel;
  readonly guard: GuardScanResult;
  readonly sandboxOk: boolean;
  readonly review: HumanReviewConsensus | null;
  readonly promotion: TrustPromotionDecision;
  readonly findings: readonly GuardFinding[];
};
