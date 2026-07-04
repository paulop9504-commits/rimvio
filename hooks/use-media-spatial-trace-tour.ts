"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import type { MediaSpatialTraceTourStop } from "@/lib/situation-projection/build-media-spatial-trace-tour";

const TOUR_STEP_MS = 4_200;
const TOUR_FLY_LEVEL = "street" as const;
const TOUR_PIN_VIEWPORT_Y = 0.62;

export type MediaSpatialTraceTourState = {
  running: boolean;
  stopIndex: number;
};

export function useMediaSpatialTraceTour(input: {
  globeRef: RefObject<RimvioGlobeHubHandle | null>;
  stops: readonly MediaSpatialTraceTourStop[];
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

  const stopTour = useCallback(() => {
    setState({ running: false, stopIndex: -1 });
    onStopChangeRef.current?.(null, -1);
  }, []);

  const startTour = useCallback(() => {
    if (input.stops.length === 0) {
      return false;
    }
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
    onStopChangeRef.current?.(stop, state.stopIndex);

    const timer = window.setTimeout(() => {
      setState((current) => {
        if (!current.running) {
          return current;
        }
        const nextIndex = current.stopIndex + 1;
        if (nextIndex >= input.stops.length) {
          onStopChangeRef.current?.(null, -1);
          return { running: false, stopIndex: -1 };
        }
        return { running: true, stopIndex: nextIndex };
      });
    }, TOUR_STEP_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [input.globeRef, input.stops, state.running, state.stopIndex, stopTour]);

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
