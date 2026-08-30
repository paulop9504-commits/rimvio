/**
 * Rimvio Index — Semantic Capability & World Index (ADR-066).
 */

import type { CapabilitySearchHit } from "@/lib/platform-sdk/capability-index";

export type ReuseDecisionKind = "reuse" | "improve" | "create";

/** Similarity thresholds — Reuse Before Create (ADR-066). */
export const REUSE_SIMILARITY_REUSE = 0.8;
export const REUSE_SIMILARITY_IMPROVE = 0.5;

export type ReuseGateResult = {
  readonly decision: ReuseDecisionKind;
  readonly topHit: CapabilitySearchHit | null;
  readonly similarity: number;
  readonly reasonKo: string;
  readonly hits: readonly CapabilitySearchHit[];
};

export type ImprovementTaskStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "review"
  | "merged"
  | "rejected";

export type ImprovementTask = {
  readonly taskId: string;
  readonly capabilityId: string;
  readonly platformId: string;
  readonly intentUtterance: string;
  readonly similarity: number;
  readonly status: ImprovementTaskStatus;
  readonly assigneeDeveloperId: string | null;
  readonly summaryKo: string;
  readonly createdAt: string;
  readonly contextEventId?: string | null;
};

export type CapabilityIntentResolution = {
  readonly utterance: string;
  readonly reuse: ReuseGateResult;
  readonly discoveryPlanCapabilityId: string | null;
  readonly improvementTaskId: string | null;
  readonly workLogKo: string;
  /** Producer/Reviewer standard policy version applied to this resolution. */
  readonly policyVersion: string;
};
