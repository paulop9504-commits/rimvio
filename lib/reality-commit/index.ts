/**
 * Rimvio Reality Commit System
 *
 * Workspace Prepare → Commit Review → User Approval
 * → Reality Transaction → External API → Reality State → Ledger
 *
 * AI never Commits. Human Approval Required.
 */

export type {
  CommitGateCheck,
  CommitGateCheckId,
  CommitGateResult,
  RealityCommitActor,
  RealityCommitLedgerEntry,
  RealityCommitResult,
  RealityCommitSource,
  RealityCommitTransaction,
  RealityCommitType,
  UserApprovalRecord,
} from "@/lib/reality-commit/types";

export {
  REALITY_COMMIT_ACTOR,
  REALITY_COMMIT_TYPES,
} from "@/lib/reality-commit/types";

export {
  assertAiCannotCommit,
  runCommitGate,
} from "@/lib/reality-commit/commit-gate";

export {
  appendRealityCommitLedgerEntry,
  clearRealityCommitLedgerForTests,
  listRealityCommitLedger,
  readRealityCommitLedgerEntry,
  REALITY_COMMIT_LEDGER_UPDATED,
} from "@/lib/reality-commit/ledger";

export {
  clearRealityCommitTransactionsForTests,
  createRealityCommitTransaction,
  invokeExternalCommitApi,
  readRealityCommitTransaction,
  runRealityCommit,
} from "@/lib/reality-commit/transaction";

export {
  COMMIT_APPROVE_CTA_KO,
  COMMIT_CONFIRM_TITLE_KO,
  formatCommitConfirmUxKo,
  formatCommitSuccessUxKo,
} from "@/lib/reality-commit/ux";

/** Legacy / booking-runtime human gate (Article 0) */
export {
  REALITY_COMMIT_POLICY,
  assertHumanRealityCommit,
  isPrepareOnlyMutation,
  type RealityCommitRequest,
  type RealityCommitGateResult,
} from "@/lib/reality-commit/assert-human-commit";
