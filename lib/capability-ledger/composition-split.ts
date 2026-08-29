/**
 * Composition chain — parentExecutionId revenue rollup (P4).
 * Composite capability payout = sum(children) minus platform fee.
 */

import {
  getLedgerEntry,
  readChildExecutions,
  updateLedgerEntry,
} from "@/lib/capability-ledger/execution-store";

export const COMPOSITE_PLATFORM_FEE_RATE = 0.15;

export type CompositionSplitResult = {
  readonly parentExecutionId: string;
  readonly childCount: number;
  readonly childPayoutSumKrw: number;
  readonly platformFeeKrw: number;
  readonly parentPayoutKrw: number;
};

export function applyCompositionRevenueSplit(
  parentExecutionId: string,
): CompositionSplitResult | null {
  const parent = getLedgerEntry(parentExecutionId);
  if (!parent) return null;

  const children = readChildExecutions(parentExecutionId);
  if (children.length === 0) return null;

  const childPayoutSumKrw = children.reduce((sum, c) => sum + c.payoutKrw, 0);
  const platformFeeKrw = Math.round(childPayoutSumKrw * COMPOSITE_PLATFORM_FEE_RATE);
  const parentPayoutKrw = Math.max(0, childPayoutSumKrw - platformFeeKrw);

  updateLedgerEntry(parentExecutionId, {
    payoutKrw: parentPayoutKrw,
    usageWeight: parent.usageWeight,
    outputQuality: Math.min(
      1,
      children.reduce((s, c) => s + c.outputQuality, 0) / children.length,
    ),
    finalized: children.every((c) => c.finalized),
  });

  return {
    parentExecutionId,
    childCount: children.length,
    childPayoutSumKrw,
    platformFeeKrw,
    parentPayoutKrw,
  };
}

export function buildCompositeLedgerContext(input: {
  readonly parentExecutionId: string;
  readonly agentId?: string;
  readonly userRequestId?: string;
  readonly contextEventId?: string;
}) {
  return {
    parentExecutionId: input.parentExecutionId,
    agentId: input.agentId ?? null,
    userRequestId: input.userRequestId ?? null,
    contextEventId: input.contextEventId ?? null,
  };
}
