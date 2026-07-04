"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import type { MediaSpatialTraceTourStop } from "@/lib/situation-projection/build-media-spatial-trace-tour";

const TOUR_STEP_MS = 8_500;
const TOUR_FLY_LEVEL = "street" as const;
const TOUR_PIN_VIEWPORT_Y = 0.62;

export type MediaSpatialTraceTourState = {
  running: boolean;
  stopIndex: number;
};

export function useMediaSpatialTraceTour(input: {
  globeRef: RefObject<RimvioGlobeHubHandle | null>;
  stops: readonly MediaSpatialTraceTourStop[];
  advancePaused?: boolean;
  onStopChange?: (
    stop: MediaSpatialTraceTourStop | null,
    index: number,
  ) => void;
}) {
  const [state, setState] = useState<MediaSpatialTraceTourState>({
    running: false,
    stopIndex: -1,
  });
  const onStopChangeRef = useRef(input.onStopChange);
  onStopChangeRef.current = input.onStopChange;
  const lastNotifiedStopIdRef = useRef<string | null>(null);
  const stopsKey = input.stops.map((stop) => stop.id).join("|");

  const stopTour = useCallback(() => {
    setState({ running: false, stopIndex: -1 });
    lastNotifiedStopIdRef.current = null;
    onStopChangeRef.current?.(null, -1);
  }, []);

  const startTour = useCallback(() => {
    if (input.stops.length === 0) {
      return false;
    }
    lastNotifiedStopIdRef.current = null;
    setState({ running: true, stopIndex: 0 });
    return true;
  }, [input.stops.length]);

  useEffect(() => {
    if (!state.running || state.stopIndex < 0) {
      return;
    }
    const stop = input.stops[state.stopIndex];
    if (!stop) {
      stopTour();
      return;
    }

    input.globeRef.current?.flyToPin(stop.lat, stop.lng, TOUR_FLY_LEVEL, {
      pinViewportY: TOUR_PIN_VIEWPORT_Y,
    });

    if (lastNotifiedStopIdRef.current !== stop.id) {
      lastNotifiedStopIdRef.current = stop.id;
      onStopChangeRef.current?.(stop, state.stopIndex);
    }

    if (input.advancePaused) {
      return;
    }

    const timer = window.setTimeout(() => {
      setState((current) => {
        if (!current.running) {
          return current;
        }
        const nextIndex = current.stopIndex + 1;
        if (nextIndex >= input.stops.length) {
          lastNotifiedStopIdRef.current = null;
          onStopChangeRef.current?.(null, -1);
          return { running: false, stopIndex: -1 };
        }
        return { running: true, stopIndex: nextIndex };
      });
    }, TOUR_STEP_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    input.advancePaused,
    input.globeRef,
    input.stops,
    state.running,
    state.stopIndex,
    stopTour,
    stopsKey,
  ]);

  useEffect(() => {
    if (!state.running) {
      return;
    }
    if (input.stops.length === 0) {
      stopTour();
    }
  }, [input.stops.length, state.running, stopTour]);

  const activeStop =
    state.stopIndex >= 0 ? (input.stops[state.stopIndex] ?? null) : null;

  return {
    activeStop,
    isRunning: state.running,
    stopIndex: state.stopIndex,
    stopCount: input.stops.length,
    startTour,
    stopTour,
  };
}
