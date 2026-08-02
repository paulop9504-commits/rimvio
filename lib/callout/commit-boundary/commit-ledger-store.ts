/**
 * Commit Ledger — records Field-approved Reality Commits only.
 * Callout never writes here.
 */

import type { CommitLedgerEntry } from "@/lib/callout/commit-boundary/types";

const memory = new Map<string, CommitLedgerEntry[]>();

export const COMMIT_LEDGER_UPDATED = "rimvio:commit-ledger-updated";

function emit(contextId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMMIT_LEDGER_UPDATED, {
      detail: { contextId },
    }),
  );
}

export function appendCommitLedgerEntry(
  entry: CommitLedgerEntry,
): CommitLedgerEntry {
  const key = entry.contextId.trim();
  const list = memory.get(key) ?? [];
  const next = [...list, entry];
  memory.set(key, next);
  emit(key);
  return entry;
}

export function listCommitLedgerEntries(
  contextId: string,
): readonly CommitLedgerEntry[] {
  return memory.get(contextId.trim()) ?? [];
}

export function clearCommitLedgerForTests(contextId?: string): void {
  if (!contextId) {
    memory.clear();
    return;
  }
  memory.delete(contextId.trim());
}
