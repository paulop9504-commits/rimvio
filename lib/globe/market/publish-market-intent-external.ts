import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import {
  findMarketIntentByEventId,
  saveMarketIntent,
  stampMarketIntentOnEvent,
} from "@/lib/globe/market/market-alignment-store";
import { syncMarketIntentRemote } from "@/lib/globe/market/client/sync-market-intent-remote";
import { syncMarketIntentGlobePin } from "@/lib/globe/market/sync-market-intent-globe-pin";

/** Portal gate — promote a local intent to external discovery + matching. */
export async function publishMarketIntentExternal(
  eventId: string,
): Promise<MarketIntentRecord | null> {
  const key = eventId.trim();
  if (!key) {
    return null;
  }
  const existing = findMarketIntentByEventId(key);
  if (!existing?.active) {
    return null;
  }
  if (existing.detail.publishedExternal) {
    return existing;
  }

  const published: MarketIntentRecord = {
    ...existing,
    detail: { ...existing.detail, publishedExternal: true },
  };
  saveMarketIntent(published);
  stampMarketIntentOnEvent(published);

  const remote = await syncMarketIntentRemote(published);
  if (remote) {
    const merged = { ...published, ...remote, id: remote.id, userId: remote.userId };
    saveMarketIntent(merged);
    stampMarketIntentOnEvent(merged);
    await syncMarketIntentGlobePin(merged);
    return merged;
  }

  return published;
}
