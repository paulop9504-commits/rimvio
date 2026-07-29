/**
 * Execute a saga — step by step. On failure, trigger rollback.
 */

import type { TransactionSaga, TransactionStep } from "@/lib/reality-transaction/types";

export type StepExecutor = (step: TransactionStep) => Promise<{
  success: boolean;
  result?: unknown;
  errorReason?: string;
}>;

export async function executeSaga(
  saga: TransactionSaga,
  executor: StepExecutor,
): Promise<TransactionSaga> {
  const now = () => new Date().toISOString();
  const updatedSteps: TransactionStep[] = [...saga.steps];
  let failed = false;

  for (let i = 0; i < updatedSteps.length; i++) {
    const step = updatedSteps[i]!;
    if (step.status !== "pending") continue;

    updatedSteps[i] = { ...step, status: "executing", executedAt: now() };

    try {
      const outcome = await executor(updatedSteps[i]!);
      if (outcome.success) {
        updatedSteps[i] = {
          ...updatedSteps[i]!,
          status: "committed",
          result: outcome.result,
        };
      } else {
        updatedSteps[i] = {
          ...updatedSteps[i]!,
          status: "failed",
          errorReason: outcome.errorReason ?? "Unknown error",
        };
        failed = true;
        break;
      }
    } catch (err) {
      updatedSteps[i] = {
        ...updatedSteps[i]!,
        status: "failed",
        errorReason: err instanceof Error ? err.message : "Unknown error",
      };
      failed = true;
      break;
    }
  }

  const committedAt = !failed ? now() : undefined;
  const undoDeadline = committedAt
    ? new Date(Date.now() + saga.undoWindowMs).toISOString()
    : undefined;

  return {
    ...saga,
    steps: updatedSteps,
    status: failed ? "failed" : "committed",
    updatedAt: now(),
    committedAt,
    undoDeadline,
  };
}
