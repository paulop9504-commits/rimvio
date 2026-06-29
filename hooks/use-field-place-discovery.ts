"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CafeDiscoveryWire } from "@/lib/context-resolver/places/types";
import { buildFieldPlaceSearchQuery } from "@/lib/globe/opportunity-field/build-field-place-search-query";
import { runStagedFieldPlacePinReveal } from "@/lib/globe/opportunity-field/globe-field-place-discovery-bridge";
import type { FieldPlaceDiscoveryResult } from "@/lib/globe/opportunity-field/run-field-place-discovery-search";
import type { OpportunityPill } from "@/lib/globe/opportunity-field/types";

export type FieldPlaceDiscoveryPayload = FieldPlaceDiscoveryResult;

const PLACE_DISCOVERY_ENDPOINT =
  process.env.NODE_ENV === "development"
    ? "/api/dev/place-search"
    : "/api/globe/place-discovery";

export function useFieldPlaceDiscovery(input: {
  enabled: boolean;
  selectedPill: OpportunityPill | null;
  lat: number | null;
  lng: number | null;
  contextId: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<FieldPlaceDiscoveryPayload | null>(null);
  const cancelRevealRef = useRef<(() => void) | null>(null);

  const query = useMemo(
    () => buildFieldPlaceSearchQuery(input.selectedPill),
    [input.selectedPill],
  );

  const refresh = useCallback(async () => {
    if (!input.enabled || !query) {
      setPayload(null);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query });
      if (input.lat != null && input.lng != null) {
        params.set("lat", String(input.lat));
        params.set("lng", String(input.lng));
      }
      const response = await fetch(
        `${PLACE_DISCOVERY_ENDPOINT}?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as FieldPlaceDiscoveryPayload;
      setPayload(data);

      cancelRevealRef.current?.();
      if (data.ok && data.pinClusters && data.pinClusters.length > 0) {
        cancelRevealRef.current = runStagedFieldPlacePinReveal({
          clusters: data.pinClusters,
          contextId: input.contextId,
        });
      }
    } catch {
      setPayload({
        ok: false,
        query: query ?? "",
        error: "place_discovery 요청 실패",
      });
    } finally {
      setLoading(false);
    }
  }, [input.contextId, input.enabled, input.lat, input.lng, query]);

  useEffect(() => {
    void refresh();
    return () => {
      cancelRevealRef.current?.();
      cancelRevealRef.current = null;
    };
  }, [refresh]);

  const wire = payload?.ok ? payload.cafeDiscovery ?? null : null;

  return {
    enabled: Boolean(query),
    loading,
    payload,
    wire,
    query,
    refresh,
  };
}
