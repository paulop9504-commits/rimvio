"use client";

import { useEffect, useState } from "react";
import { loadTrendBridgeSettings } from "@/lib/globe/trend-bridge/trend-bridge-settings";
import type { PinPulsePlaceContext } from "@/lib/globe/trend-bridge/server/fetch-pin-pulse-place-context";

export function usePinPulseContext(input: {
  enabled: boolean;
  lat: number | null;
  lng: number | null;
  placeLabel?: string | null;
  userCaptureAt?: string | null;
}): {
  context: PinPulsePlaceContext | null;
  loading: boolean;
} {
  const [context, setContext] = useState<PinPulsePlaceContext | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input.enabled) {
      setContext(null);
      setLoading(false);
      return;
    }
    const lat = input.lat;
    const lng = input.lng;
    if (
      lat === null ||
      lng === null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      setContext(null);
      return;
    }

    const bridgeId =
      loadTrendBridgeSettings().activeBridgeId?.trim() || "food.cafe";
    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          bridgeId,
          placeLabel: input.placeLabel?.trim() ?? "",
        });
        if (input.userCaptureAt?.trim()) {
          params.set("userCaptureAt", input.userCaptureAt.trim());
        }
        const response = await fetch(
          `/api/globe/trend-bridge/place-context?${params.toString()}`,
        );
        if (!response.ok) {
          throw new Error("place_context_failed");
        }
        const body = (await response.json()) as {
          ok?: boolean;
          context?: PinPulsePlaceContext | null;
        };
        if (!cancelled) {
          setContext(body.context ?? null);
        }
      } catch {
        if (!cancelled) {
          setContext(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    input.enabled,
    input.lat,
    input.lng,
    input.placeLabel,
    input.userCaptureAt,
  ]);

  return { context, loading };
}
