/**
 * Execution Ledger — append-only capability execution history (spine primitive #10).
 *
 * Who ran what capability, when, with what result — foundation for Capability Economy.
 */

import type { RimvioPlatformExecutionPhase } from "@/lib/hub/dev/platform-agent/execution-loop";
import type { CapabilityExecutionResult } from "@/lib/hub/dev/platform-agent/execution-loop";

export type ExecutionLedgerEntryKind =
  | "phase"
  | "capability"
  | "verification"
  | "replan"
  | "approval"
  | "commit";

export type ExecutionLedgerEntry = {
  readonly id: string;
  readonly at: number;
  readonly goalId: string;
  readonly kind: ExecutionLedgerEntryKind;
  readonly phase: RimvioPlatformExecutionPhase;
  readonly capabilityId?: string;
  readonly toolId?: string;
  readonly success: boolean;
  readonly summaryKo: string;
  readonly result?: CapabilityExecutionResult;
};

export type ExecutionLedger = {
  readonly goalId: string;
  readonly entries: readonly ExecutionLedgerEntry[];
};

let entryCounter = 0;

function nextEntryId(): string {
  entryCounter += 1;
  return `exec-${Date.now()}-${entryCounter}`;
}

export function createExecutionLedger(goalId: string): ExecutionLedger {
  return { goalId, entries: [] };
}

export function appendLedgerEntry(
  ledger: ExecutionLedger,
  entry: Omit<ExecutionLedgerEntry, "id" | "at" | "goalId">,
): ExecutionLedger {
  const full: ExecutionLedgerEntry = {
    id: nextEntryId(),
    at: Date.now(),
    goalId: ledger.goalId,
    ...entry,
  };
  return { ...ledger, entries: [...ledger.entries, full] };
}

export function ledgerPhaseEntry(
  ledger: ExecutionLedger,
  phase: RimvioPlatformExecutionPhase,
  summaryKo: string,
): ExecutionLedger {
  return appendLedgerEntry(ledger, {
    kind: "phase",
    phase,
    success: true,
    summaryKo,
  });
}

export function ledgerCapabilityEntry(
  ledger: ExecutionLedger,
  input: {
    readonly phase: RimvioPlatformExecutionPhase;
    readonly toolId: string;
    readonly capabilityId?: string;
    readonly success: boolean;
    readonly summaryKo: string;
    readonly result?: CapabilityExecutionResult;
  },
): ExecutionLedger {
  return appendLedgerEntry(ledger, {
    kind: "capability",
    phase: input.phase,
    toolId: input.toolId,
    capabilityId: input.capabilityId,
    success: input.success,
    summaryKo: input.summaryKo,
    result: input.result,
  });
}

export function ledgerVerificationEntry(
  ledger: ExecutionLedger,
  ok: boolean,
  detailKo: string,
): ExecutionLedger {
  return appendLedgerEntry(ledger, {
    kind: "verification",
    phase: "verify",
    success: ok,
    summaryKo: detailKo,
  });
}

export function ledgerReplanEntry(
  ledger: ExecutionLedger,
  reasonKo: string,
): ExecutionLedger {
  return appendLedgerEntry(ledger, {
    kind: "replan",
    phase: "replan",
    success: false,
    summaryKo: reasonKo,
  });
}

/** Summarize ledger for Activity / work log. */
export function summarizeExecutionLedger(ledger: ExecutionLedger): string {
  const caps = ledger.entries.filter((e) => e.kind === "capability");
  const failed = caps.filter((e) => !e.success).length;
  const replans = ledger.entries.filter((e) => e.kind === "replan").length;
  return `실행 ${caps.length} · 실패 ${failed} · replan ${replans}`;
}

export function resetExecutionLedgerCounterForTests(): void {
  entryCounter = 0;
}
