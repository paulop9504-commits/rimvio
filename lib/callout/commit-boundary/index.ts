/**
 * Reality Commit Boundary — Callout vs Field.
 */

export type {
  CalloutAllowedMode,
  CommitLedgerEntry,
  FieldRealityCommitReject,
  FieldRealityCommitRequest,
  FieldRealityCommitResult,
  FieldRealityCommitStage,
} from "@/lib/callout/commit-boundary/types";
export {
  CALLOUT_ALLOWED_MODES,
  FIELD_REALITY_COMMIT_STAGES,
} from "@/lib/callout/commit-boundary/types";

export {
  appendCommitLedgerEntry,
  clearCommitLedgerForTests,
  COMMIT_LEDGER_UPDATED,
  listCommitLedgerEntries,
} from "@/lib/callout/commit-boundary/commit-ledger-store";

export {
  assertCalloutCannotCommit,
  buildFieldHandoffFromCallout,
  filterCalloutModes,
  isCalloutAllowedMode,
  runFieldRealityCommit,
} from "@/lib/callout/commit-boundary/run-field-reality-commit";
