/**
 * Durable Capability Execution persistence (P3).
 * Best-effort Supabase append; in-memory SSOT remains execution-store.
 */

import type { CapabilityExecutionLedgerEntry } from "@/lib/capability-ledger/types";

type PersistRow = {
  execution_id: string;
  user_request_id: string;
  context_event_id: string | null;
  parent_execution_id: string | null;
  agent_id: string | null;
  capability_id: string;
  tool_id: string | null;
  developer_id: string;
  publisher_id: string | null;
  provider_id: string | null;
  input_class: string;
  pricing_tier: string;
  execution_status: string;
  output_quality: number;
  usage_weight: number;
  unit_price_krw: number;
  payout_krw: number;
  manifest_version: string | null;
  finalized: boolean;
  executed_at: string;
};

function toPersistRow(entry: CapabilityExecutionLedgerEntry): PersistRow {
  return {
    execution_id: entry.executionId,
    user_request_id: entry.userRequestId,
    context_event_id: entry.contextEventId ?? null,
    parent_execution_id: entry.parentExecutionId ?? null,
    agent_id: entry.agentId ?? null,
    capability_id: entry.capabilityId,
    tool_id: entry.toolId ?? null,
    developer_id: entry.developerId,
    publisher_id: entry.publisherId ?? null,
    provider_id: entry.providerId ?? null,
    input_class: entry.inputClass,
    pricing_tier: entry.pricingTier,
    execution_status: entry.executionStatus,
    output_quality: entry.outputQuality,
    usage_weight: entry.usageWeight,
    unit_price_krw: entry.unitPriceKrw,
    payout_krw: entry.payoutKrw,
    manifest_version: entry.manifestVersion ?? null,
    finalized: entry.finalized,
    executed_at: entry.timestamp,
  };
}

/** Server-side persist queue — no-op on client bundle unless API called. */
const serverQueue: PersistRow[] = [];

export function drainPersistQueueForServer(): readonly PersistRow[] {
  const batch = [...serverQueue];
  serverQueue.length = 0;
  return batch;
}

export async function persistCapabilityExecutionAsync(
  entry: CapabilityExecutionLedgerEntry,
): Promise<void> {
  const row = toPersistRow(entry);
  serverQueue.push(row);

  if (typeof window !== "undefined") {
    try {
      await fetch("/api/capability-ledger/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
        keepalive: true,
      });
    } catch {
      // fail-open — in-memory ledger is SSOT for dev
    }
  }
}

export { toPersistRow, type PersistRow };
