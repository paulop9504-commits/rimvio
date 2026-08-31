/**
 * Capability Execution Ledger — types (P0 SSOT).
 * Append-only provenance: user request → agent → tool → capability → payout.
 */

import type { CapabilityId } from "@/lib/capability-registry/capability-contract";
import type { RimvioToolId } from "@/lib/tool-registry";

export const CAPABILITY_LEDGER_VERSION = 1 as const;

export type CapabilityInputClass =
  | "transform"
  | "lookup"
  | "rank"
  | "analyze"
  | "agent"
  | "execute"
  | "commit_gate";

export type CapabilityPricingTier = "T0" | "T1" | "T2" | "T3" | "T4" | "T5";

export type CapabilityExecutionStatus =
  | "success"
  | "partial"
  | "empty"
  | "failed"
  | "blocked";

export type CapabilityLedgerContext = {
  readonly userRequestId?: string | null;
  readonly contextEventId?: string | null;
  readonly agentId?: string | null;
  readonly parentExecutionId?: string | null;
  readonly developerId?: string | null;
  readonly publisherId?: string | null;
  readonly providerId?: string | null;
};

export type CapabilityExecutionLedgerEntry = {
  readonly executionId: string;
  readonly userRequestId: string;
  readonly contextEventId?: string | null;
  readonly parentExecutionId?: string | null;
  readonly agentId?: string | null;
  readonly capabilityId: CapabilityId;
  readonly toolId?: RimvioToolId | null;
  readonly developerId: string;
  readonly publisherId?: string | null;
  readonly providerId?: string | null;
  readonly inputClass: CapabilityInputClass;
  readonly pricingTier: CapabilityPricingTier;
  readonly executionStatus: CapabilityExecutionStatus;
  readonly outputQuality: number;
  readonly usageWeight: number;
  readonly unitPriceKrw: number;
  readonly payoutKrw: number;
  readonly manifestVersion?: string | null;
  readonly finalized: boolean;
  readonly timestamp: string;
};

export type RecordCapabilityExecutionInput = {
  readonly toolId: RimvioToolId;
  readonly toolOk: boolean;
  readonly candidateCount?: number;
  readonly waitingCommit?: boolean;
  readonly summaryKo?: string | null;
  readonly inputClassOverride?: CapabilityInputClass;
  readonly ledgerContext?: CapabilityLedgerContext | null;
};

export type FinalizeCapabilityExecutionInput = {
  readonly executionId: string;
  readonly executionStatus: CapabilityExecutionStatus;
  readonly outputQuality: number;
  readonly usageWeight: number;
  readonly verified: boolean;
};

export type DeveloperWalletSummary = {
  readonly developerId: string;
  readonly totalPayoutKrw: number;
  readonly executionCount: number;
  readonly successCount: number;
  readonly pendingPayoutKrw: number;
  readonly lastExecutionAt?: string | null;
};

export type PayoutRollupRow = {
  readonly developerId: string;
  readonly capabilityId: CapabilityId;
  readonly executionCount: number;
  readonly totalPayoutKrw: number;
  readonly avgQuality: number;
};
