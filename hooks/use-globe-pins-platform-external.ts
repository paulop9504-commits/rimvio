"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExternalGlobeTrace } from "@/lib/globe/external-globe-trace-types";
import { fetchGlobePinsIndex } from "@/lib/globe/fetch-globe-pins-index";
import { projectionRecordToExternalTrace } from "@/lib/globe/pin-projection-index-record";
import { PIN_DOMAIN_SHIP_PHASE } from "@/lib/globe/pin-domain-registry";
import { bboxFromGlobePinsNear } from "@/lib/globe/query-pin-projection-index";

const DEFAULT_RADIUS_M = 900;
const GPS_DEBOUNCE_MS = 700;
const GPS_MIN_MOVE_M = 120;

function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type UseGlobePinsPlatformExternalInput = {
  enabled?: boolean;
  lat: number | null;
  lng: number | null;
  radiusM?: number;
};

/** P2 — external layer via unified `/api/globe/pins` index (replaces direct trace fetch). */
export function useGlobePinsPlatformExternal(
  input: UseGlobePinsPlatformExternalInput,
) {
  const enabled = (input.enabled ?? true) && PIN_DOMAIN_SHIP_PHASE >= 2;
  const [traces, setTraces] = useState<ExternalGlobeTrace[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [stableCoords, setStableCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const lastStableRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!enabled || input.lat == null || input.lng == null) {
      setStableCoords(null);
      lastStableRef.current = null;
      return;
    }

    const next = { lat: input.lat, lng: input.lng };
    const prev = lastStableRef.current;
    const movedEnough =
      !prev ||
      haversineMeters(prev.lat, prev.lng, next.lat, next.lng) >= GPS_MIN_MOVE_M;

    if (!movedEnough) {
      return;
    }

    const timer = window.setTimeout(() => {
      lastStableRef.current = next;
      setStableCoords(next);
    }, GPS_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [enabled, input.lat, input.lng]);

  const refresh = useCallback(async () => {
    if (!enabled || stableCoords == null) {
      setTraces([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const radiusM = input.radiusM ?? DEFAULT_RADIUS_M;
    const bbox = bboxFromGlobePinsNear({
      lat: stableCoords.lat,
      lng: stableCoords.lng,
      radiusM,
    });

    try {
      const response = await fetchGlobePinsIndex({
        query: { mode: "near", lat: stableCoords.lat, lng: stableCoords.lng, radiusM, bbox },
        includeExternal: true,
        signal: controller.signal,
      });
      const next = response.external
        .map((record) => projectionRecordToExternalTrace(record))
        .filter((row): row is ExternalGlobeTrace => Boolean(row));
      setTraces(next);
    } catch {
      if (!controller.signal.aborted) {
        setTraces([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [enabled, stableCoords, input.radiusM]);

  useEffect(() => {
    void refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  return { traces, loading, refresh };
}
