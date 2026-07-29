/**
 * Undo Window — time-limited cancellation after commit.
 * "방금 예약했습니다 [취소]" UX pattern.
 */

import type { TransactionSaga } from "@/lib/reality-transaction/types";

export function isWithinUndoWindow(saga: TransactionSaga): boolean {
  if (saga.status !== "committed") return false;
  if (!saga.undoDeadline) return false;
  return new Date(saga.undoDeadline) > new Date();
}

export function getRemainingUndoMs(saga: TransactionSaga): number {
  if (!saga.undoDeadline) return 0;
  const remaining = new Date(saga.undoDeadline).getTime() - Date.now();
  return Math.max(0, remaining);
}

export function formatUndoCountdown(saga: TransactionSaga): string {
  const ms = getRemainingUndoMs(saga);
  if (ms <= 0) return "취소 불가";
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}초 내 취소 가능`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}분 내 취소 가능`;
}
