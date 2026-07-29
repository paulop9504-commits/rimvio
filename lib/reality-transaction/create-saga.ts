/**
 * Create a TransactionSaga from a list of operations.
 */

import type { TransactionSaga, TransactionStep } from "@/lib/reality-transaction/types";
import { DEFAULT_UNDO_WINDOW_MS } from "@/lib/reality-transaction/types";

export type CreateSagaInput = {
  readonly contextEventId: string;
  readonly operations: readonly {
    readonly operationId: string;
    readonly labelKo: string;
    readonly compensationAction?: string;
  }[];
  readonly undoWindowMs?: number;
};

export function createSaga(input: CreateSagaInput): TransactionSaga {
  const now = new Date().toISOString();
  const steps: TransactionStep[] = input.operations.map((op) => ({
    stepId: `step-${op.operationId}`,
    operationId: op.operationId,
    labelKo: op.labelKo,
    status: "pending",
    compensationAction: op.compensationAction,
  }));

  return {
    sagaId: `saga-${Date.now()}`,
    contextEventId: input.contextEventId,
    steps,
    status: "created",
    undoWindowMs: input.undoWindowMs ?? DEFAULT_UNDO_WINDOW_MS,
    createdAt: now,
    updatedAt: now,
  };
}
