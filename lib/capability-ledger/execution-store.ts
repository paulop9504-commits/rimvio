/**
 * In-memory Capability Execution Ledger store (P0).
 */

import type { CapabilityExecutionLedgerEntry } from "@/lib/capability-ledger/types";

const MAX_ENTRIES = 5000;
const entries: CapabilityExecutionLedgerEntry[] = [];
let executionCounter = 0;

export function nextExecutionId(): string {
  executionCounter += 1;
  return `cexec-${Date.now()}-${executionCounter}`;
}

export function appendLedgerEntry(entry: CapabilityExecutionLedgerEntry): void {
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
}

export function updateLedgerEntry(
  executionId: string,
  patch: Partial<CapabilityExecutionLedgerEntry>,
): CapabilityExecutionLedgerEntry | null {
  const idx = entries.findIndex((e) => e.executionId === executionId);
  if (idx < 0) return null;
  const updated = { ...entries[idx]!, ...patch };
  entries[idx] = updated;
  return updated;
}

export function readLedgerEntries(): readonly CapabilityExecutionLedgerEntry[] {
  return entries;
}

export function getLedgerEntry(executionId: string): CapabilityExecutionLedgerEntry | null {
  return entries.find((e) => e.executionId === executionId) ?? null;
}

export function readChildExecutions(
  parentExecutionId: string,
): readonly CapabilityExecutionLedgerEntry[] {
  return entries.filter((e) => e.parentExecutionId === parentExecutionId);
}

export function resetCapabilityLedgerForTests(): void {
  entries.length = 0;
  executionCounter = 0;
}

export const CAPABILITY_LEDGER_UPDATED = "rimvio-capability-ledger-updated";

export function notifyCapabilityLedgerUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CAPABILITY_LEDGER_UPDATED));
  }
}
