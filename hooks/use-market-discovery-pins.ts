"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";

const DEFAULT_RADIUS_KM = 15;

export type UseMarketDiscoveryPinsInput = {
  enabled?: boolean;
  lat: number | null;
  lng: number | null;
  radiusKm?: number;
};

/** 밖 지구 — others' published @중고 portal projections. */
export function useMarketDiscoveryPins(input: UseMarketDiscoveryPinsInput) {
  const enabled = input.enabled ?? true;
  const [intents, setIntents] = useState<MarketIntentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setIntents([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const params = new URLSearchParams();
    if (input.lat != null && input.lng != null) {
      params.set("lat", String(input.lat));
      params.set("lng", String(input.lng));
    }
    params.set("radiusKm", String(input.radiusKm ?? DEFAULT_RADIUS_KM));

    try {
      const response = await fetch(
        `/api/globe/market-intent/discovery?${params.toString()}`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        setIntents([]);
        return;
      }
      const body = (await response.json()) as { intents?: MarketIntentRecord[] };
      setIntents(Array.isArray(body.intents) ? body.intents : []);
    } catch {
      if (!controller.signal.aborted) {
        setIntents([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [enabled, input.lat, input.lng, input.radiusKm]);

  useEffect(() => {
    void refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  return { intents, loading, refresh };
}
