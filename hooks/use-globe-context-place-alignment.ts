"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  alignGlobeContextPlaces,
  type AlignGlobeContextPlacesResult,
} from "@/lib/globe/align-globe-context-places";

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
const INITIAL_DELAY_MS = 2_500;

export function useGlobeContextPlaceAlignment(input: {
  enabled?: boolean;
  intervalMs?: number;
  userLat?: number | null;
  userLng?: number | null;
  onAligned?: (result: AlignGlobeContextPlacesResult) => void;
}) {
  const runningRef = useRef(false);
  const onAlignedRef = useRef(input.onAligned);
  onAlignedRef.current = input.onAligned;

  const run = useCallback(async () => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;
    try {
      const result = await alignGlobeContextPlaces({
        userLat: input.userLat,
        userLng: input.userLng,
      });
      onAlignedRef.current?.(result);
    } finally {
      runningRef.current = false;
    }
  }, [input.userLat, input.userLng]);

  useEffect(() => {
    if (input.enabled === false) {
      return;
    }

    const initialTimer = window.setTimeout(() => {
      void run();
    }, INITIAL_DELAY_MS);

    const interval = window.setInterval(() => {
      void run();
    }, input.intervalMs ?? DEFAULT_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [input.enabled, input.intervalMs, run]);
}
