/**
 * Reality Commit Ledger — immutable record of every Reality change.
 * Only Human-approved Transactions are written.
 */

import type { RealityCommitLedgerEntry } from "@/lib/reality-commit/types";
import { REALITY_COMMIT_ACTOR } from "@/lib/reality-commit/types";

const byWorkspace = new Map<string, RealityCommitLedgerEntry[]>();
const byId = new Map<string, RealityCommitLedgerEntry>();
const allEntries: RealityCommitLedgerEntry[] = [];

export const REALITY_COMMIT_LEDGER_UPDATED =
  "rimvio:reality-commit-ledger-updated";

function emit(workspaceId: string | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(REALITY_COMMIT_LEDGER_UPDATED, {
      detail: { workspaceId },
    }),
  );
}

export function appendRealityCommitLedgerEntry(
  entry: RealityCommitLedgerEntry,
): RealityCommitLedgerEntry {
  if (entry.actor !== REALITY_COMMIT_ACTOR) {
    throw new Error("Commit Ledger accepts actor:user only");
  }
  byId.set(entry.entryId, entry);
  allEntries.push(entry);
  const ws = entry.workspaceId?.trim() || "_global";
  const list = byWorkspace.get(ws) ?? [];
  byWorkspace.set(ws, [...list, entry]);
  emit(entry.workspaceId);
  return entry;
}

export function readRealityCommitLedgerEntry(
  entryId: string,
): RealityCommitLedgerEntry | null {
  return byId.get(entryId.trim()) ?? null;
}

export function listRealityCommitLedger(
  workspaceId?: string | null,
): readonly RealityCommitLedgerEntry[] {
  if (!workspaceId?.trim()) return [...allEntries];
  return byWorkspace.get(workspaceId.trim()) ?? [];
}

export function clearRealityCommitLedgerForTests(
  workspaceId?: string,
): void {
  if (!workspaceId) {
    byWorkspace.clear();
    byId.clear();
    allEntries.length = 0;
    return;
  }
  const key = workspaceId.trim();
  const list = byWorkspace.get(key) ?? [];
  for (const e of list) {
    byId.delete(e.entryId);
    const idx = allEntries.findIndex((x) => x.entryId === e.entryId);
    if (idx >= 0) allEntries.splice(idx, 1);
  }
  byWorkspace.delete(key);
}
