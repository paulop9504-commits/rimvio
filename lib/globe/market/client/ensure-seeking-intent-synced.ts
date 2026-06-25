import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import {
  saveMarketIntent,
  stampMarketIntentOnEvent,
} from "@/lib/globe/market/market-alignment-store";
import {
  fetchOwnMarketIntentsRemote,
  syncMarketIntentRemote,
} from "@/lib/globe/market/client/sync-market-intent-remote";

/** Field chat/schedule needs a server-side seeking row — upsert local copy first. */
export async function ensureSeekingIntentSynced(
  seeking: MarketIntentRecord,
): Promise<MarketIntentRecord> {
  const own = await fetchOwnMarketIntentsRemote();
  const remoteByEvent = own.find(
    (row) =>
      row.eventId === seeking.eventId && row.role === "seeking" && row.active,
  );
  if (remoteByEvent) {
    return remoteByEvent;
  }

  const synced = await syncMarketIntentRemote(seeking);
  if (synced) {
    const merged = { ...seeking, ...synced, id: synced.id, userId: synced.userId };
    saveMarketIntent(merged);
    stampMarketIntentOnEvent(merged);
    return merged;
  }

  throw new Error("seeking_not_found");
}
