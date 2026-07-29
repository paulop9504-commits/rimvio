/**
 * Rollback a saga — compensate committed steps in reverse order.
 */

import type { TransactionSaga, TransactionStep } from "@/lib/reality-transaction/types";

export type CompensationExecutor = (step: TransactionStep) => Promise<boolean>;

export async function rollbackSaga(
  saga: TransactionSaga,
  compensator: CompensationExecutor,
): Promise<TransactionSaga> {
  const now = () => new Date().toISOString();

  if (saga.undoDeadline && new Date(saga.undoDeadline) < new Date()) {
    return { ...saga, status: "failed", updatedAt: now() };
  }

  const updatedSteps: TransactionStep[] = [...saga.steps];
  const committedIndices = updatedSteps
    .map((s, i) => (s.status === "committed" ? i : -1))
    .filter((i) => i >= 0)
    .reverse();

  let allCompensated = true;

  for (const idx of committedIndices) {
    const step = updatedSteps[idx]!;
    updatedSteps[idx] = { ...step, status: "compensating" };

    try {
      const ok = await compensator(step);
      updatedSteps[idx] = {
        ...updatedSteps[idx]!,
        status: ok ? "compensated" : "failed",
      };
      if (!ok) allCompensated = false;
    } catch {
      updatedSteps[idx] = { ...updatedSteps[idx]!, status: "failed" };
      allCompensated = false;
    }
  }

  return {
    ...saga,
    steps: updatedSteps,
    status: allCompensated ? "compensated" : "failed",
    updatedAt: now(),
  };
}
