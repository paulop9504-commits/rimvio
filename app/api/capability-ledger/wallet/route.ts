import { NextResponse } from "next/server";
import {
  getDeveloperWallet,
  listDeveloperWallets,
  readLedgerEntries,
  rollupPayoutByDeveloper,
} from "@/lib/capability-ledger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const developerId = searchParams.get("developerId");

  const entries = readLedgerEntries();

  if (developerId) {
    const wallet = getDeveloperWallet(developerId, entries);
    const rollup = rollupPayoutByDeveloper(entries).filter(
      (r) => r.developerId === developerId,
    );
    return NextResponse.json({
      ok: true,
      wallet,
      rollup,
      source: "memory",
    });
  }

  return NextResponse.json({
    ok: true,
    wallets: listDeveloperWallets(entries),
    rollup: rollupPayoutByDeveloper(entries),
    executionCount: entries.length,
    source: "memory",
  });
}
