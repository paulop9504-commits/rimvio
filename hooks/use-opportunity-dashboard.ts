"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCopy } from "@/hooks/use-copy";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { useRegionalProfile } from "@/hooks/use-regional-profile";
import { fetchOwnMarketIntentsRemote } from "@/lib/globe/market/client/sync-market-intent-remote";
import {
  listAllMarketIntents,
  mergeOwnMarketIntents,
  subscribeMarketIntents,
} from "@/lib/globe/market/market-alignment-store";
import { filterPublishedMarketIntents } from "@/lib/globe/market/filter-published-market-intents";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import {
  buildUserStateV1,
  listExternalBrowseRows,
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
  return mergeOwnMarketIntents(local, remote);
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
  browseRows: OpportunityRow[];
  selectedContextId: string | null;
  setSelectedContextId: (id: string | null) => void;
  selectedPill: OpportunityPill | null;
  listeningLabel: string;
  fieldCopy: OpportunityFieldCopy;
  refresh: () => void;
} {
  const copy = useCopy();
  const { user } = useAuth();
  const { profile: regionalProfile } = useRegionalProfile();
  const liveLocation = useLiveLocationSnapshot();
  const [revision, setRevision] = useState(0);
  const [remoteRows, setRemoteRows] = useState<MarketIntentRecord[]>([]);
  const [pool, setPool] = useState<MarketIntentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const lastGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastDiscoveryGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const loadedOnceRef = useRef(false);
  const hadLocationRef = useRef(false);
  const liveLocationRef = useRef(liveLocation);
  liveLocationRef.current = liveLocation;

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
      loadedOnceRef.current = false;
      hadLocationRef.current = false;
      setHydrated(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const isInitialLoad = !loadedOnceRef.current;
    if (isInitialLoad) {
      setLoading(true);
    }

    void (async () => {
      const snapshot = liveLocationRef.current;
      const lat = snapshot?.lat ?? null;
      const lng = snapshot?.lng ?? null;
      const [remote, discovery] = await Promise.all([
        user?.id ? fetchOwnMarketIntentsRemote() : Promise.resolve([]),
        fetchPool(lat, lng),
      ]);
      if (!cancelled) {
        if (lat != null && lng != null) {
          hadLocationRef.current = true;
          lastGpsRef.current = { lat, lng };
          lastDiscoveryGpsRef.current = { lat, lng };
        }
        setRemoteRows(remote);
        setPool(discovery);
        loadedOnceRef.current = true;
        setHydrated(true);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchPool, input.open, revision, user?.id]);

  /** GPS fix after first paint — refresh in place without skeleton. */
  useEffect(() => {
    if (!input.open || !hydrated || liveLocation?.lat == null || liveLocation?.lng == null) {
      return;
    }
    if (hadLocationRef.current) {
      return;
    }
    hadLocationRef.current = true;
    lastGpsRef.current = { lat: liveLocation.lat, lng: liveLocation.lng };
    lastDiscoveryGpsRef.current = { lat: liveLocation.lat, lng: liveLocation.lng };
    refresh();
  }, [hydrated, input.open, liveLocation?.lat, liveLocation?.lng, refresh]);

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
    const merged = mergeOwnIntents(listAllMarketIntents(), remoteRows);
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
        regionalProfile,
      }),
    [fieldCopy, pool, regionalProfile, seekings, userState],
  );

  const selectedPill = useMemo(
    () =>
      selectedContextId
        ? (pills.find((pill) => pill.contextId === selectedContextId) ?? null)
        : null,
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
      regionalProfile,
    });
  }, [fieldCopy, pool, regionalProfile, selectedPill, userState]);

  const browseRows = useMemo(
    () =>
      listExternalBrowseRows({
        pool,
        userState,
        copy: fieldCopy,
        regionalProfile,
      }),
    [fieldCopy, pool, regionalProfile, userState],
  );

  const listeningLabel =
    selectedPill != null
      ? copy.globe.field.listening(selectedPill.title)
      : copy.globe.field.discoveryBrowseListening;

  return {
    loading,
    pills,
    rows,
    browseRows,
    selectedContextId,
    setSelectedContextId,
    selectedPill,
    listeningLabel,
    fieldCopy,
    refresh,
  };
}
