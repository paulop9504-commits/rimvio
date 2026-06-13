"use client";

import { useEffect, useState, type RefObject } from "react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import {
  resolveGlobeContextVideoScreenLayout,
  type GlobeContextVideoScreenLayout,
} from "@/lib/globe/resolve-globe-context-video-layout";

const ANCHOR_FRAME_MS = 66; // ~15 fps — enough for pin-anchored video overlay

export function useGlobePinScreenAnchor(input: {
  globeRef: RefObject<RimvioGlobeHubHandle | null>;
  lat: number | null | undefined;
  lng: number | null | undefined;
  enabled?: boolean;
  containerRef?: RefObject<HTMLElement | null>;
}): GlobeContextVideoScreenLayout | null {
  const [layout, setLayout] = useState<GlobeContextVideoScreenLayout | null>(
    null,
  );
  const lat = input.lat;
  const lng = input.lng;
  const enabled = input.enabled !== false;

  useEffect(() => {
    if (
      !enabled ||
      lat == null ||
      lng == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      setLayout(null);
      return;
    }

    let cancelled = false;

    const tick = () => {
      const globe = input.globeRef.current;
      const container = input.containerRef?.current;
      const viewportWidth = container?.clientWidth ?? window.innerWidth;
      const viewportHeight = container?.clientHeight ?? window.innerHeight;
      const screen = globe?.getScreenCoords(lat, lng) ?? null;
      const altitude = globe?.getPointOfView()?.altitude ?? null;
      if (!cancelled) {
        setLayout(
          resolveGlobeContextVideoScreenLayout({
            screen,
            altitude,
            viewportWidth,
            viewportHeight,
          }),
        );
      }
    };

    tick();
    const intervalId = window.setInterval(tick, ANCHOR_FRAME_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, lat, lng, input.globeRef, input.containerRef]);

  return layout;
}
