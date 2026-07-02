"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { fetchOwnMarketIntentsRemote } from "@/lib/globe/market/client/sync-market-intent-remote";
import {
  listActiveMarketIntents,
  subscribeMarketIntents,
} from "@/lib/globe/market/market-alignment-store";
import { filterPublishedMarketIntents } from "@/lib/globe/market/filter-published-market-intents";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import {
  buildUserStateV1,
  listExternalBrowseRows,
  listOpportunityPills,
  type OpportunityFieldCopy,
} from "@/lib/globe/opportunity-field";
import { shouldSkipGlobeFetch } from "@/lib/globe/globe-fetch-min-interval";

export type OpportunityFieldBadgeCounts = {
  matchedCount: number;
  browseCount: number;
};

const PASSIVE_POLL_MS = 90_000;
const DEFAULT_RADIUS_KM = 15;
const DISCOVERY_FETCH_MIN_MS = 60_000;

function mergeOwnIntents(
  local: readonly MarketIntentRecord[],
  remote: readonly MarketIntentRecord[],
): MarketIntentRecord[] {
  const merged = new Map<string, MarketIntentRecord>();
  for (const row of local) {
    if (row.active) {
      merged.set(row.eventId, row);
    }
  }
  for (const row of remote) {
    if (row.active) {
      merged.set(row.eventId, row);
    }
  }
  return [...merged.values()];
}

/** Passive counts for utility menu / nav — no observation GPS burst. */
export function useOpportunityFieldBadge(input: {
  enabled: boolean;
  primaryEventId?: string | null;
}): OpportunityFieldBadgeCounts {
  const copy = useCopy();
  const { user } = useAuth();
  const liveLocation = useLiveLocationSnapshot();
  const [revision, setRevision] = useState(0);
  const [remoteRows, setRemoteRows] = useState<MarketIntentRecord[]>([]);
  const [pool, setPool] = useState<MarketIntentRecord[]>([]);

  const fieldCopy = useMemo<OpportunityFieldCopy>(
    () => ({
      reasonBattery: copy.globe.field.reasonBattery,
      reasonStorage: copy.globe.field.reasonStorage,
      reasonPrice: copy.globe.field.reasonPrice,
      reasonDistance: copy.globe.field.reasonDistance,
      reasonRecency: copy.globe.field.reasonRecency,
      reasonCondition: copy.globe.field.reasonCondition,
      reasonFallback: copy.globe.field.reasonFallback,
    }),
    [copy.globe.field],
  );

  const refresh = useCallback(() => {
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => subscribeMarketIntents(refresh), [refresh]);

  const fetchPool = useCallback(async (lat: number | null, lng: number | null) => {
    const params = new URLSearchParams();
    if (lat != null && lng != null) {
      params.set("lat", String(lat));
      params.set("lng", String(lng));
    }
    params.set("radiusKm", String(DEFAULT_RADIUS_KM));
    const response = await fetch(
      `/api/globe/market-intent/discovery?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      return [] as MarketIntentRecord[];
    }
    const body = (await response.json()) as { intents?: MarketIntentRecord[] };
    return Array.isArray(body.intents) ? body.intents : [];
  }, []);

  useEffect(() => {
    if (!input.enabled) {
      return;
    }
    if (shouldSkipGlobeFetch("field:opportunity-discovery", DISCOVERY_FETCH_MIN_MS)) {
      return;
    }
    let cancelled = false;

    void (async () => {
      const [remote, discovery] = await Promise.all([
        user?.id ? fetchOwnMarketIntentsRemote() : Promise.resolve([]),
        fetchPool(liveLocation?.lat ?? null, liveLocation?.lng ?? null),
      ]);
      if (!cancelled) {
        setRemoteRows(remote);
        setPool(discovery);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    fetchPool,
    input.enabled,
    liveLocation?.lat,
    liveLocation?.lng,
    revision,
    user?.id,
  ]);

  useEffect(() => {
    if (!input.enabled) {
      return;
    }
    const id = window.setInterval(() => refresh(), PASSIVE_POLL_MS);
    return () => window.clearInterval(id);
  }, [input.enabled, refresh]);

  const seekings = useMemo(() => {
    void revision;
    const merged = mergeOwnIntents(listActiveMarketIntents(), remoteRows);
    return filterPublishedMarketIntents(
      merged.filter((row) => row.role === "seeking"),
    );
  }, [remoteRows, revision]);

  const userState = useMemo(
    () =>
      buildUserStateV1({
        lat: liveLocation?.lat ?? null,
        lng: liveLocation?.lng ?? null,
        capturedAtIso: liveLocation?.capturedAtIso ?? null,
        primaryEventId: input.primaryEventId ?? null,
        now: new Date(),
      }),
    [
      input.primaryEventId,
      liveLocation?.capturedAtIso,
      liveLocation?.lat,
      liveLocation?.lng,
      revision,
    ],
  );

  const pills = useMemo(
    () =>
      listOpportunityPills({
        seekings,
        pool,
        userState,
        copy: fieldCopy,
      }),
    [fieldCopy, pool, seekings, userState],
  );

  const browseRows = useMemo(
    () =>
      listExternalBrowseRows({
        pool,
        userState,
        copy: fieldCopy,
      }),
    [fieldCopy, pool, userState],
  );

  return useMemo(
    () => ({
      matchedCount: pills.reduce((sum, pill) => sum + pill.count, 0),
      browseCount: browseRows.length,
    }),
    [browseRows.length, pills],
  );
}
