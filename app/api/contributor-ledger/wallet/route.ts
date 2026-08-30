import { NextResponse } from "next/server";
import {
  getUnifiedContributorWallet,
  readContributorLedger,
} from "@/lib/contributor-ledger";
import { getDeveloperWallet } from "@/lib/capability-ledger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contributorId = searchParams.get("contributorId");

  if (!contributorId) {
    return NextResponse.json({
      ok: true,
      ledger: readContributorLedger(),
    });
  }

  const unified = getUnifiedContributorWallet(contributorId);
  const capabilityWallet = getDeveloperWallet(contributorId);
  const entries = readContributorLedger()
    .filter((e) => e.contributorId === contributorId)
    .slice(-50)
    .reverse();

  return NextResponse.json({
    ok: true,
    contributorId,
    unified,
    capabilityWallet,
    totalCombinedKrw: unified.totalKrw + capabilityWallet.pendingPayoutKrw,
    entries,
  });
}
