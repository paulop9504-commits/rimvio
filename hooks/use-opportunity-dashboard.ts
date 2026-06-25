"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  listOpportunityPills,
  listOpportunityRows,
  OPPORTUNITY_DISCOVERY_MOVE_M,
  OPPORTUNITY_POLL_MS,
  OPPORTUNITY_RESCORE_MOVE_M,
  type OpportunityFieldCopy,
  type OpportunityPill,
  type OpportunityRow,
} from "@/lib/globe/opportunity-field";
import {
  startOpportunityObservationMode,
  stopOpportunityObservationMode,
} from "@/lib/globe/opportunity-field/observation-gps-session";
import { haversineKm } from "@/lib/globe/trend-bridge/server/trend-bridge-geo";

const DEFAULT_RADIUS_KM = 15;

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

function movedMeters(
  from: { lat: number; lng: number } | null,
  to: { lat: number; lng: number } | null,
): number {
  if (!from || !to) {
    return 0;
  }
  return haversineKm(from.lat, from.lng, to.lat, to.lng) * 1000;
}

export function useOpportunityDashboard(input: {
  open: boolean;
  primaryEventId?: string | null;
}): {
  loading: boolean;
  pills: OpportunityPill[];
  rows: OpportunityRow[];
  selectedContextId: string | null;
  setSelectedContextId: (id: string) => void;
  selectedPill: OpportunityPill | null;
  listeningLabel: string;
  fieldCopy: OpportunityFieldCopy;
  refresh: () => void;
} {
  const copy = useCopy();
  const { user } = useAuth();
  const liveLocation = useLiveLocationSnapshot();
  const [revision, setRevision] = useState(0);
  const [remoteRows, setRemoteRows] = useState<MarketIntentRecord[]>([]);
  const [pool, setPool] = useState<MarketIntentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const lastGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastDiscoveryGpsRef = useRef<{ lat: number; lng: number } | null>(null);

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

  useEffect(() => {
    if (!input.open) {
      stopOpportunityObservationMode();
      return;
    }
    startOpportunityObservationMode();
    return () => stopOpportunityObservationMode();
  }, [input.open]);

  const fetchPool = useCallback(
    async (lat: number | null, lng: number | null, signal?: AbortSignal) => {
      const params = new URLSearchParams();
      if (lat != null && lng != null) {
        params.set("lat", String(lat));
        params.set("lng", String(lng));
      }
      params.set("radiusKm", String(DEFAULT_RADIUS_KM));
      const response = await fetch(
        `/api/globe/market-intent/discovery?${params.toString()}`,
        { signal, cache: "no-store" },
      );
      if (!response.ok) {
        return [] as MarketIntentRecord[];
      }
      const body = (await response.json()) as { intents?: MarketIntentRecord[] };
      return Array.isArray(body.intents) ? body.intents : [];
    },
    [],
  );

  useEffect(() => {
    if (!input.open) {
      return;
    }
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const [remote, discovery] = await Promise.all([
        user?.id ? fetchOwnMarketIntentsRemote() : Promise.resolve([]),
        fetchPool(liveLocation?.lat ?? null, liveLocation?.lng ?? null),
      ]);
      if (!cancelled) {
        setRemoteRows(remote);
        setPool(discovery);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchPool, input.open, liveLocation?.lat, liveLocation?.lng, revision, user?.id]);

  useEffect(() => {
    if (!input.open) {
      return;
    }
    const id = window.setInterval(() => refresh(), OPPORTUNITY_POLL_MS);
    return () => window.clearInterval(id);
  }, [input.open, refresh]);

  useEffect(() => {
    if (!input.open || liveLocation?.lat == null || liveLocation?.lng == null) {
      return;
    }
    const next = { lat: liveLocation.lat, lng: liveLocation.lng };
    const fromLast = lastGpsRef.current;
    const moveM = movedMeters(fromLast, next);
    lastGpsRef.current = next;

    if (moveM < OPPORTUNITY_RESCORE_MOVE_M) {
      return;
    }

    if (moveM >= OPPORTUNITY_DISCOVERY_MOVE_M) {
      const fromDiscovery = lastDiscoveryGpsRef.current;
      const discoveryMove = movedMeters(fromDiscovery, next);
      if (discoveryMove >= OPPORTUNITY_DISCOVERY_MOVE_M || !fromDiscovery) {
        lastDiscoveryGpsRef.current = next;
        void fetchPool(next.lat, next.lng).then((rows) => setPool(rows));
      }
    }

    setRevision((value) => value + 1);
  }, [
    fetchPool,
    input.open,
    liveLocation?.capturedAtIso,
    liveLocation?.lat,
    liveLocation?.lng,
  ]);

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

  useEffect(() => {
    if (!input.open || pills.length === 0) {
      return;
    }
    if (!selectedContextId || !pills.some((pill) => pill.contextId === selectedContextId)) {
      setSelectedContextId(pills[0]!.contextId);
    }
  }, [input.open, pills, selectedContextId]);

  const selectedPill = useMemo(
    () => pills.find((pill) => pill.contextId === selectedContextId) ?? null,
    [pills, selectedContextId],
  );

  const rows = useMemo(() => {
    if (!selectedPill) {
      return [] as OpportunityRow[];
    }
    return listOpportunityRows({
      seeking: selectedPill.seeking,
      pool,
      userState,
      copy: fieldCopy,
    });
  }, [fieldCopy, pool, selectedPill, userState]);

  const listeningLabel = selectedPill
    ? copy.globe.field.listening(selectedPill.title)
    : copy.globe.field.sheetTitle;

  return {
    loading,
    pills,
    rows,
    selectedContextId,
    setSelectedContextId,
    selectedPill,
    listeningLabel,
    fieldCopy,
    refresh,
  };
}
