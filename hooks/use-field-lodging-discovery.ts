"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { isFieldLodgingDiscoveryPill } from "@/lib/globe/opportunity-field/build-field-lodging-discovery-enabled";
import { runStagedFieldPlacePinReveal } from "@/lib/globe/opportunity-field/globe-field-place-discovery-bridge";
import { projectLodgingDiscoveryPinClusters } from "@/lib/globe/opportunity-field/project-lodging-discovery-pin-cluster";
import {
  formatFieldLodgingPriceLine,
  scoreFieldLodgingRows,
  type ScoredFieldLodgingRow,
} from "@/lib/globe/opportunity-field/score-field-lodging-rows";
import type { OpportunityPill } from "@/lib/globe/opportunity-field/types";

type MarketPricePayload = {
  ok?: boolean;
  inventory?: ContextLodgingInventoryRow[];
  source?: string;
  error?: string;
};

export function useFieldLodgingDiscovery(input: {
  enabled: boolean;
  selectedPill: OpportunityPill | null;
  lat: number | null;
  lng: number | null;
  contextId: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ScoredFieldLodgingRow[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const cancelRevealRef = useRef<(() => void) | null>(null);

  const lodgingPill = useMemo(
    () => isFieldLodgingDiscoveryPill(input.selectedPill),
    [input.selectedPill],
  );

  const refresh = useCallback(async () => {
    if (!input.enabled || !lodgingPill || input.lat == null || input.lng == null) {
      setRows([]);
      setSource(null);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: String(input.lat),
        lng: String(input.lng),
        max: "5",
      });
      const response = await fetch(`/api/globe/market-price?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setRows([]);
        return;
      }
      const data = (await response.json()) as MarketPricePayload;
      const inventory = Array.isArray(data.inventory) ? data.inventory : [];
      const scored = scoreFieldLodgingRows({
        rows: inventory,
        lat: input.lat,
        lng: input.lng,
      });
      setRows(scored);
      setSource(data.source ?? null);

      cancelRevealRef.current?.();
      if (scored.length > 0) {
        const reasonMap = new Map(
          scored.map((entry) => [entry.row.placeId, entry.reasonKo]),
        );
        const clusters = projectLodgingDiscoveryPinClusters(
          scored.map((entry) => entry.row),
          reasonMap,
        );
        cancelRevealRef.current = runStagedFieldPlacePinReveal({
          clusters,
          contextId: input.contextId,
        });
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [input.contextId, input.enabled, input.lat, input.lng, lodgingPill]);

  useEffect(() => {
    void refresh();
    return () => {
      cancelRevealRef.current?.();
      cancelRevealRef.current = null;
    };
  }, [refresh]);

  return {
    enabled: lodgingPill,
    loading,
    rows,
    source,
    refresh,
  };
}

export { formatFieldLodgingPriceLine };
