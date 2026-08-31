import type { CapabilityId } from "@/lib/capability-registry/capability-contract";
import type { CapabilityExecutionLedgerEntry } from "@/lib/capability-ledger/types";
import {
  appendLedgerEntry,
  nextExecutionId,
  notifyCapabilityLedgerUpdated,
} from "@/lib/capability-ledger/execution-store";
import { persistCapabilityExecutionAsync } from "@/lib/capability-ledger/persist-execution";

export function recordSandboxExecution(input: {
  sessionId: string;
  capabilityId: string;
  userRequest: string;
  ok: boolean;
  verified: boolean;
  executionMs: number;
}): CapabilityExecutionLedgerEntry {
  const entry: CapabilityExecutionLedgerEntry = {
    executionId: nextExecutionId(),
    userRequestId: input.sessionId,
    contextEventId: input.sessionId,
    parentExecutionId: null,
    agentId: "dev-agent",
    capabilityId: input.capabilityId as CapabilityId,
    toolId: "hotel.lookup",
    developerId: "dev-hub",
    publisherId: "dev-hub",
    providerId: "sandbox",
    inputClass: "execute",
    pricingTier: "T2",
    executionStatus: input.ok ? (input.verified ? "success" : "partial") : "failed",
    outputQuality: input.verified ? 1 : input.ok ? 0.6 : 0,
    usageWeight: input.ok ? 1 : 0.2,
    unitPriceKrw: 0,
    payoutKrw: 0,
    manifestVersion: "sandbox.v1",
    finalized: true,
    timestamp: new Date().toISOString(),
  };

  appendLedgerEntry(entry);
  notifyCapabilityLedgerUpdated();
  void persistCapabilityExecutionAsync(entry);
  return entry;
}
