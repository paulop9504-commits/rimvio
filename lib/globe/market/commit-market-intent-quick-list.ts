import { buildMarketQuickListDraft } from "@/lib/globe/market/build-market-quick-list-draft";
import { commitMarketIntentFromDraft } from "@/lib/globe/market/commit-market-intent";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";

/** @중고 one-liner → pin + external matching queue (no wizard). */
export async function commitMarketIntentQuickList(input: {
  composeText: string;
  eventId: string;
  liveLat?: number | null;
  liveLng?: number | null;
}): Promise<MarketIntentRecord | null> {
  const draft = buildMarketQuickListDraft(input);
  if (!draft) {
    return null;
  }
  return commitMarketIntentFromDraft(draft, { publishExternal: true });
}
