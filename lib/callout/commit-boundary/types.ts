/**
 * Reality Commit Boundary
 *
 * Callout MAY: Observe · Explore · Simulate · Prepare
 * Callout MUST NOT: Commit
 *
 * Commit path (Field only):
 *   [예약 확정] → Reality Transaction → User Approval → Commit Ledger
 */

export const CALLOUT_ALLOWED_MODES = [
  "observe",
  "explore",
  "simulate",
  "prepare",
] as const;

export type CalloutAllowedMode = (typeof CALLOUT_ALLOWED_MODES)[number];

export const FIELD_REALITY_COMMIT_STAGES = [
  "field_action",
  "reality_transaction",
  "user_approval",
  "commit_ledger",
] as const;

export type FieldRealityCommitStage =
  (typeof FIELD_REALITY_COMMIT_STAGES)[number];

export type FieldRealityCommitRequest = {
  readonly contextId: string;
  readonly objectId: string;
  readonly title: string;
  readonly labelKo: string;
  readonly reservationDraftId?: string | null;
};

export type CommitLedgerEntry = {
  readonly entryId: string;
  readonly contextId: string;
  readonly objectId: string;
  readonly sagaId: string;
  readonly labelKo: string;
  readonly title: string;
  readonly approvedAtIso: string;
  readonly status: "recorded";
};

export type FieldRealityCommitResult = {
  readonly ok: true;
  readonly stagesCompleted: readonly FieldRealityCommitStage[];
  readonly sagaId: string;
  readonly ledgerEntry: CommitLedgerEntry;
  readonly summaryKo: string;
};

export type FieldRealityCommitReject = {
  readonly ok: false;
  readonly reasonKo: string;
  /** True when Callout tried to Commit directly */
  readonly calloutAttemptedCommit: boolean;
};
