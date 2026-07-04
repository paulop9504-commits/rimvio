"use client";

import type { MarketIntentExposureMode } from "@/lib/globe/market/market-intent-detail";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { syncMarketIntentRemote } from "@/lib/globe/market/client/sync-market-intent-remote";
import {
  listActiveMarketIntents,
  updateMarketIntent,
} from "@/lib/globe/market/market-alignment-store";
import type { LiveLocationSnapshot } from "@/lib/location-ping/project-live-location-snapshot";
import {
  buildMarketIntentLiveExposureDetail,
  isMarketIntentLiveExposureEligible,
  readMarketIntentExposureMode,
  shouldSyncMarketIntentLiveExposureAnchor,
} from "@/lib/globe/market/market-intent-exposure";

async function persistRemote(record: MarketIntentRecord): Promise<MarketIntentRecord> {
  const remote = await syncMarketIntentRemote(record);
  if (!remote) {
    return record;
  }
  return (
    updateMarketIntent(record.eventId, () => ({
      ...record,
      ...remote,
      id: remote.id,
      userId: remote.userId,
      detail: remote.detail,
    })) ?? remote
  );
}

export async function setMarketIntentExposureMode(input: {
  eventId: string;
  mode: MarketIntentExposureMode;
  snapshot?: LiveLocationSnapshot | null;
}): Promise<MarketIntentRecord | null> {
  const updated = updateMarketIntent(input.eventId, (record) => {
    const nextDetail =
      input.mode === "live" && input.snapshot
        ? buildMarketIntentLiveExposureDetail(
            { ...record.detail, exposureMode: "live" },
            input.snapshot,
          )
        : { ...record.detail, exposureMode: input.mode };
    return {
      ...record,
      detail: nextDetail,
    };
  });
  if (!updated) {
    return null;
  }
  return persistRemote(updated);
}

export async function syncMarketIntentLiveExposureAnchors(
  snapshot: LiveLocationSnapshot | null,
): Promise<number> {
  if (!snapshot) {
    return 0;
  }
  const candidates = listActiveMarketIntents().filter(
    (record) =>
      isMarketIntentLiveExposureEligible(record) &&
      readMarketIntentExposureMode(record.detail) === "live" &&
      shouldSyncMarketIntentLiveExposureAnchor(record, snapshot),
  );
  if (candidates.length === 0) {
    return 0;
  }
  const updated = candidates
    .map((record) =>
      updateMarketIntent(record.eventId, (current) => ({
        ...current,
        detail: buildMarketIntentLiveExposureDetail(current.detail, snapshot),
      })),
    )
    .filter((record): record is MarketIntentRecord => record != null);
  await Promise.all(updated.map((record) => persistRemote(record).catch(() => record)));
  return updated.length;
}
