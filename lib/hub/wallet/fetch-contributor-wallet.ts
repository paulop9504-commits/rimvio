import type { DeveloperWalletSummary } from "@/lib/capability-ledger/types";
import type {
  ContributorLedgerEntry,
  UnifiedContributorWallet,
} from "@/lib/contributor-ledger";

export type ContributorWalletSnapshot = {
  readonly contributorId: string;
  readonly unified: UnifiedContributorWallet;
  readonly capabilityWallet: DeveloperWalletSummary;
  readonly totalCombinedKrw: number;
  readonly entries: readonly ContributorLedgerEntry[];
};

export async function fetchContributorWallet(
  contributorId: string,
): Promise<ContributorWalletSnapshot | null> {
  try {
    const res = await fetch(
      `/api/contributor-ledger/wallet?contributorId=${encodeURIComponent(contributorId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      ok?: boolean;
      contributorId?: string;
      unified?: UnifiedContributorWallet;
      capabilityWallet?: DeveloperWalletSummary;
      totalCombinedKrw?: number;
      entries?: readonly ContributorLedgerEntry[];
    };
    if (!body.ok || !body.unified || !body.capabilityWallet) return null;
    return {
      contributorId: body.contributorId ?? contributorId,
      unified: body.unified,
      capabilityWallet: body.capabilityWallet,
      totalCombinedKrw: body.totalCombinedKrw ?? body.unified.totalKrw,
      entries: body.entries ?? [],
    };
  } catch {
    return null;
  }
}
