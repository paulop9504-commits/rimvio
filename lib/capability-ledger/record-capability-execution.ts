/**
 * Record capability execution — append-only ledger (P0–P2).
 */

import type {
  CapabilityExecutionLedgerEntry,
  FinalizeCapabilityExecutionInput,
  RecordCapabilityExecutionInput,
} from "@/lib/capability-ledger/types";
import {
  INPUT_CLASS_TIER,
  TIER_UNIT_PRICE_KRW,
  defaultDeveloperIdForTool,
  resolveCapabilityIdForTool,
  resolveInputClassForTool,
} from "@/lib/capability-ledger/tier-table";
import {
  computeOutputQuality,
  computePayoutKrw,
  computeUsageWeight,
  deriveExecutionStatus,
} from "@/lib/capability-ledger/usage-weight";
import {
  appendLedgerEntry,
  getLedgerEntry,
  nextExecutionId,
  notifyCapabilityLedgerUpdated,
  updateLedgerEntry,
} from "@/lib/capability-ledger/execution-store";
import { persistCapabilityExecutionAsync } from "@/lib/capability-ledger/persist-execution";
import { applyCompositionRevenueSplit } from "@/lib/capability-ledger/composition-split";
import { mergeCapabilityExecutionIntoContributorLedger } from "@/lib/contributor-ledger/record-contributor-payout";

function buildUserRequestId(ctx: RecordCapabilityExecutionInput["ledgerContext"]): string {
  if (ctx?.userRequestId?.trim()) return ctx.userRequestId.trim();
  if (ctx?.contextEventId?.trim()) return ctx.contextEventId.trim();
  return `req-${Date.now()}`;
}

export function recordCapabilityExecution(
  input: RecordCapabilityExecutionInput,
): CapabilityExecutionLedgerEntry {
  const ctx = input.ledgerContext ?? {};
  const toolId = input.toolId;
  const inputClass = input.inputClassOverride ?? resolveInputClassForTool(toolId);
  const pricingTier = INPUT_CLASS_TIER[inputClass];
  const unitPriceKrw = TIER_UNIT_PRICE_KRW[pricingTier];
  const capabilityId = resolveCapabilityIdForTool(toolId);
  const developerId =
    ctx.developerId?.trim() || defaultDeveloperIdForTool(toolId);

  const weightInput = {
    toolId,
    toolOk: input.toolOk,
    candidateCount: input.candidateCount,
    waitingCommit: input.waitingCommit,
    pickedId: null as string | null,
  };

  const executionStatus = deriveExecutionStatus(weightInput);
  const outputQuality = computeOutputQuality(weightInput);
  const usageWeight = computeUsageWeight(weightInput);
  const payoutKrw = computePayoutKrw({ unitPriceKrw, usageWeight, executionStatus });

  const entry: CapabilityExecutionLedgerEntry = {
    executionId: nextExecutionId(),
    userRequestId: buildUserRequestId(ctx),
    contextEventId: ctx.contextEventId ?? null,
    parentExecutionId: ctx.parentExecutionId ?? null,
    agentId: ctx.agentId ?? null,
    capabilityId,
    toolId,
    developerId,
    publisherId: ctx.publisherId ?? developerId,
    providerId: ctx.providerId ?? null,
    inputClass,
    pricingTier,
    executionStatus,
    outputQuality,
    usageWeight,
    unitPriceKrw,
    payoutKrw,
    manifestVersion: null,
    finalized: inputClass === "commit_gate",
    timestamp: new Date().toISOString(),
  };

  appendLedgerEntry(entry);
  notifyCapabilityLedgerUpdated();

  if (entry.parentExecutionId) {
    applyCompositionRevenueSplit(entry.parentExecutionId);
  }

  void persistCapabilityExecutionAsync(entry);

  return entry;
}

export function finalizeCapabilityExecution(
  input: FinalizeCapabilityExecutionInput,
): CapabilityExecutionLedgerEntry | null {
  const existing = getLedgerEntry(input.executionId);
  if (!existing) return null;

  const unitPriceKrw = existing.unitPriceKrw;
  const payoutKrw = computePayoutKrw({
    unitPriceKrw,
    usageWeight: input.usageWeight,
    executionStatus: input.executionStatus,
  });

  const updated = updateLedgerEntry(input.executionId, {
    executionStatus: input.executionStatus,
    outputQuality: input.outputQuality,
    usageWeight: input.usageWeight,
    payoutKrw,
    finalized: true,
  });

  if (updated) {
    notifyCapabilityLedgerUpdated();
    if (updated.payoutKrw > 0 && updated.finalized) {
      mergeCapabilityExecutionIntoContributorLedger({
        executionId: updated.executionId,
        developerId: updated.developerId,
        capabilityId: updated.capabilityId,
        payoutKrw: updated.payoutKrw,
      });
    }
    if (updated.parentExecutionId) {
      applyCompositionRevenueSplit(updated.parentExecutionId);
    }
    void persistCapabilityExecutionAsync(updated);
  }

  return updated;
}

/** Record + finalize in one call (orchestrator path after verify). */
export function recordVerifiedCapabilityExecution(
  input: RecordCapabilityExecutionInput & {
    readonly verified: boolean;
    readonly pickedId?: string | null;
  },
): CapabilityExecutionLedgerEntry {
  const preliminary = recordCapabilityExecution(input);

  const weightInput = {
    toolId: input.toolId,
    toolOk: input.toolOk,
    candidateCount: input.candidateCount,
    waitingCommit: input.waitingCommit,
    verified: input.verified,
    pickedId: input.pickedId ?? null,
  };

  const executionStatus = deriveExecutionStatus(weightInput);
  const outputQuality = computeOutputQuality(weightInput);
  const usageWeight = computeUsageWeight(weightInput);

  return (
    finalizeCapabilityExecution({
      executionId: preliminary.executionId,
      executionStatus,
      outputQuality,
      usageWeight,
      verified: input.verified,
    }) ?? preliminary
  );
}

/** Agent-level composite execution (P4 parent node). */
export function recordAgentCompositeExecution(input: {
  readonly agentId: string;
  readonly userRequestId: string;
  readonly contextEventId?: string;
  readonly developerId?: string;
}): CapabilityExecutionLedgerEntry {
  return recordCapabilityExecution({
    toolId: "hotel.lookup",
    toolOk: true,
    inputClassOverride: "agent",
    ledgerContext: {
      userRequestId: input.userRequestId,
      contextEventId: input.contextEventId ?? null,
      agentId: input.agentId,
      developerId: input.developerId ?? `agent-${input.agentId}`,
    },
  });
}
