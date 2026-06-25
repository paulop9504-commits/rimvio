"use client";

import { useCallback, useEffect, useState } from "react";
import { OpportunityDashboardSheet } from "@/components/field/opportunity-dashboard-sheet";
import { useGlobeLayerMode } from "@/hooks/use-globe-layer-mode";
import {
  publishFieldSheetOpen,
  subscribeOpenFieldSheet,
  type FieldSheetOpenRequest,
} from "@/lib/nav/field-sheet-bridge";

/** Global Field dashboard — bottom nav opens this sheet instead of /field route. */
export function FieldDashboardHost() {
  const { layerMode, setLayerMode } = useGlobeLayerMode();
  const [open, setOpen] = useState(false);
  const [primaryEventId, setPrimaryEventId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeOpenFieldSheet((request: FieldSheetOpenRequest) => {
      setPrimaryEventId(request.primaryEventId ?? null);
      setOpen(true);
    });
  }, []);

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    publishFieldSheetOpen(next);
    if (!next) {
      setPrimaryEventId(null);
    }
  }, []);

  useEffect(() => {
    publishFieldSheetOpen(open);
  }, [open]);

  return (
    <OpportunityDashboardSheet
      open={open}
      onOpenChange={onOpenChange}
      layerMode={layerMode}
      primaryEventId={primaryEventId}
      onSwitchToDiscovery={() => setLayerMode("discovery")}
    />
  );
}
