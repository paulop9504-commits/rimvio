"use client";

import { useEffect } from "react";
import { useLiveLocationSnapshot } from "@/hooks/use-live-location-snapshot";
import { syncMarketIntentLiveExposureAnchors } from "@/lib/globe/market/market-intent-exposure-actions";

/** Keeps published live-exposure contexts aligned with the latest shared GPS snapshot. */
export function useMarketLiveExposureSync(enabled: boolean): void {
  const snapshot = useLiveLocationSnapshot();

  useEffect(() => {
    if (!enabled || !snapshot) {
      return;
    }
    void syncMarketIntentLiveExposureAnchors(snapshot);
  }, [enabled, snapshot?.capturedAtIso, snapshot?.lat, snapshot?.lng]);
}
