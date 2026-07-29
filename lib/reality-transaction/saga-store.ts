/**
 * Saga persistence — sessionStorage for active sagas.
 */

import type { TransactionSaga } from "@/lib/reality-transaction/types";

const STORAGE_KEY = "rimvio.sagas.v1";

function readAll(): TransactionSaga[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TransactionSaga[]) : [];
  } catch {
    return [];
  }
}

function writeAll(sagas: TransactionSaga[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sagas));
  } catch { /* quota */ }
}

export function saveSaga(saga: TransactionSaga): void {
  const all = readAll().filter((s) => s.sagaId !== saga.sagaId);
  all.push(saga);
  writeAll(all);
}

export function readSaga(sagaId: string): TransactionSaga | null {
  return readAll().find((s) => s.sagaId === sagaId) ?? null;
}

export function listActiveSagas(): readonly TransactionSaga[] {
  return readAll().filter(
    (s) => s.status === "created" || s.status === "executing",
  );
}

export function listUndoableSagas(): readonly TransactionSaga[] {
  const now = new Date();
  return readAll().filter(
    (s) =>
      s.status === "committed" &&
      s.undoDeadline &&
      new Date(s.undoDeadline) > now,
  );
}

export function clearSagas(): void {
  writeAll([]);
}
