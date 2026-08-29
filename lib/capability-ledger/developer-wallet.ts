/**
 * Payout rollup + Developer Wallet (P5).
 */

import type {
  CapabilityExecutionLedgerEntry,
  DeveloperWalletSummary,
  PayoutRollupRow,
} from "@/lib/capability-ledger/types";
import { readLedgerEntries } from "@/lib/capability-ledger/execution-store";

export function rollupPayoutByDeveloper(
  entries: readonly CapabilityExecutionLedgerEntry[] = readLedgerEntries(),
): readonly PayoutRollupRow[] {
  const map = new Map<
    string,
    Map<string, { count: number; payout: number; qualitySum: number }>
  >();

  for (const e of entries) {
    if (!e.finalized && e.executionStatus !== "blocked") {
      continue;
    }
    const devMap = map.get(e.developerId) ?? new Map();
    const cap = e.capabilityId;
    const row = devMap.get(cap) ?? { count: 0, payout: 0, qualitySum: 0 };
    devMap.set(cap, {
      count: row.count + 1,
      payout: row.payout + e.payoutKrw,
      qualitySum: row.qualitySum + e.outputQuality,
    });
    map.set(e.developerId, devMap);
  }

  const rows: PayoutRollupRow[] = [];
  for (const [developerId, capMap] of map) {
    for (const [capabilityId, agg] of capMap) {
      rows.push({
        developerId,
        capabilityId: capabilityId as PayoutRollupRow["capabilityId"],
        executionCount: agg.count,
        totalPayoutKrw: agg.payout,
        avgQuality: agg.count > 0 ? Math.round((agg.qualitySum / agg.count) * 100) / 100 : 0,
      });
    }
  }
  return rows.sort((a, b) => b.totalPayoutKrw - a.totalPayoutKrw);
}

export function getDeveloperWallet(
  developerId: string,
  entries: readonly CapabilityExecutionLedgerEntry[] = readLedgerEntries(),
): DeveloperWalletSummary {
  const mine = entries.filter((e) => e.developerId === developerId);
  const finalized = mine.filter((e) => e.finalized);
  const pending = mine.filter((e) => !e.finalized && e.payoutKrw > 0);
  const success = finalized.filter(
    (e) => e.executionStatus === "success" || e.executionStatus === "partial",
  );

  return {
    developerId,
    totalPayoutKrw: finalized.reduce((s, e) => s + e.payoutKrw, 0),
    executionCount: mine.length,
    successCount: success.length,
    pendingPayoutKrw: pending.reduce((s, e) => s + e.payoutKrw, 0),
    lastExecutionAt: mine.length > 0 ? mine[mine.length - 1]!.timestamp : null,
  };
}

export function listDeveloperWallets(
  entries: readonly CapabilityExecutionLedgerEntry[] = readLedgerEntries(),
): readonly DeveloperWalletSummary[] {
  const ids = new Set(entries.map((e) => e.developerId));
  return [...ids]
    .map((id) => getDeveloperWallet(id, entries))
    .sort((a, b) => b.totalPayoutKrw - a.totalPayoutKrw);
}
