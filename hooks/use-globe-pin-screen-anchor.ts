"use client";

import { useEffect, useState, type RefObject } from "react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import {
  resolveGlobeContextVideoScreenLayout,
  type GlobeContextVideoScreenLayout,
} from "@/lib/globe/resolve-globe-context-video-layout";

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

    let frame = 0;

    const tick = () => {
      const globe = input.globeRef.current;
      const container = input.containerRef?.current;
      const viewportWidth = container?.clientWidth ?? window.innerWidth;
      const viewportHeight = container?.clientHeight ?? window.innerHeight;
      const screen = globe?.getScreenCoords(lat, lng) ?? null;
      const altitude = globe?.getPointOfView()?.altitude ?? null;
      setLayout(
        resolveGlobeContextVideoScreenLayout({
          screen,
          altitude,
          viewportWidth,
          viewportHeight,
        }),
      );
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [enabled, lat, lng, input.globeRef, input.containerRef]);

  return layout;
}
