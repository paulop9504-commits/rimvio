/**
 * Reality Transaction Engine — Saga pattern + Rollback + Undo window.
 */

export type TransactionStepStatus =
  | "pending"
  | "executing"
  | "committed"
  | "failed"
  | "compensating"
  | "compensated";

export type TransactionStep = {
  readonly stepId: string;
  readonly operationId: string;
  readonly labelKo: string;
  readonly status: TransactionStepStatus;
  readonly compensationAction?: string;
  readonly result?: unknown;
  readonly errorReason?: string;
  readonly executedAt?: string;
};

export type TransactionSagaStatus =
  | "created"
  | "executing"
  | "committed"
  | "rolling_back"
  | "compensated"
  | "failed";

export type TransactionSaga = {
  readonly sagaId: string;
  readonly contextEventId: string;
  readonly steps: readonly TransactionStep[];
  readonly status: TransactionSagaStatus;
  readonly undoWindowMs: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly committedAt?: string;
  readonly undoDeadline?: string;
};

/** Default undo window: 5 minutes after commit. */
export const DEFAULT_UNDO_WINDOW_MS = 5 * 60 * 1000;
