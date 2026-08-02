/**
 * Reality Commit System — Workspace Prepare → Reality.
 *
 * AI never Commits. Human Approval Required (Article 0).
 *
 * Flow:
 *   Workspace Prepare → Commit Review → User Approval
 *   → Reality Transaction → External API → Reality State Update → Ledger
 */

export const REALITY_COMMIT_ACTOR = "user" as const;
export type RealityCommitActor = typeof REALITY_COMMIT_ACTOR;

export const REALITY_COMMIT_TYPES = [
  "hotel_reservation",
  "flight_booking",
  "purchase",
  "schedule_confirm",
] as const;

export type RealityCommitType = (typeof REALITY_COMMIT_TYPES)[number];

export type RealityCommitSource =
  | "field"
  | "human"
  | "ai"
  | "agent"
  | "callout"
  | "workspace";

/**
 * Reality Transaction — every Reality mutation is a user-authored tx.
 */
export type RealityCommitTransaction = {
  readonly id: string;
  readonly type: string;
  readonly beforeState: Readonly<Record<string, unknown>>;
  readonly afterState: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
  readonly actor: RealityCommitActor;
  readonly entityId: string;
  readonly prepareId: string | null;
  readonly workspaceId: string | null;
  readonly externalApi: {
    readonly attempted: boolean;
    readonly ok: boolean;
    readonly provider: string;
    readonly referenceId: string | null;
    readonly detailKo: string | null;
  };
  readonly status: "committed";
};

/** Ledger row — immutable record of a Reality change. */
export type RealityCommitLedgerEntry = {
  readonly entryId: string;
  readonly transactionId: string;
  readonly type: string;
  readonly entityId: string;
  /** @deprecated prefer previousState — kept for existing readers */
  readonly beforeState: Readonly<Record<string, unknown>>;
  /** @deprecated prefer newState */
  readonly afterState: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
  readonly actor: RealityCommitActor;
  readonly workspaceId: string | null;
  readonly prepareId: string | null;
  readonly summaryKo: string;
  /** Draft / Prepare that led to this Commit */
  readonly sourceDraftId: string;
  readonly approvedAt: string;
  readonly previousState: Readonly<Record<string, unknown>>;
  readonly newState: Readonly<Record<string, unknown>>;
  /** External booking / payment reference */
  readonly externalReference: string;
};

export type CommitGateCheckId =
  | "user_approval"
  | "policy_check"
  | "external_action";

export type CommitGateCheck = {
  readonly id: CommitGateCheckId;
  readonly ok: boolean;
  readonly detailKo: string;
};

export type CommitGateResult =
  | {
      readonly ok: true;
      readonly checks: readonly CommitGateCheck[];
    }
  | {
      readonly ok: false;
      readonly checks: readonly CommitGateCheck[];
      readonly reasonKo: string;
      readonly aiAttemptedCommit: boolean;
    };

export type RealityCommitResult =
  | {
      readonly ok: true;
      readonly transaction: RealityCommitTransaction;
      readonly ledgerEntry: RealityCommitLedgerEntry;
      readonly stagesCompleted: readonly string[];
      readonly summaryKo: string;
    }
  | {
      readonly ok: false;
      readonly reasonKo: string;
      readonly aiAttemptedCommit: boolean;
      readonly gate: CommitGateResult | null;
    };

export type UserApprovalRecord = {
  readonly approved: boolean;
  readonly approvedAtIso: string;
  readonly approverId?: string | null;
  /** Must be human — never "ai" / "agent" */
  readonly channel: "field" | "human";
};
