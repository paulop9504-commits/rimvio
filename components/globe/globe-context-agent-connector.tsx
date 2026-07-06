"use client";

import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { useGlobePinScreenAnchor } from "@/hooks/use-globe-pin-screen-anchor";
import {
  readGlobeInfoFrameLayout,
  type GlobeInfoFrameLayout,
} from "@/lib/globe/brain-surface-floating-frame-layout";

export type GlobeContextAgentConnectorProps = {
  visible: boolean;
  globeRef: RefObject<RimvioGlobeHubHandle | null>;
  pinLat: number | null;
  pinLng: number | null;
};

function resolveFrameAnchor(layout: GlobeInfoFrameLayout): { x: number; y: number } {
  return {
    x: layout.left + layout.width * 0.5,
    y: layout.top + 8,
  };
}

/** Visual link — selected context pin ↔ Container AI floating frame. */
export function GlobeContextAgentConnector({
  visible,
  globeRef,
  pinLat,
  pinLng,
}: GlobeContextAgentConnectorProps) {
  const [mounted, setMounted] = useState(false);
  const [frameLayout, setFrameLayout] = useState<GlobeInfoFrameLayout | null>(
    null,
  );
  const pinAnchor = useGlobePinScreenAnchor({
    globeRef,
    lat: pinLat,
    lng: pinLng,
    enabled: visible,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!visible) {
      setFrameLayout(null);
      return;
    }
    const tick = () => {
      setFrameLayout(readGlobeInfoFrameLayout("context-condition-prompt"));
    };
    tick();
    const intervalId = window.setInterval(tick, 66);
    return () => window.clearInterval(intervalId);
  }, [visible]);

  if (
    !mounted ||
    !visible ||
    !pinAnchor?.onScreen ||
    pinAnchor.x == null ||
    pinAnchor.y == null ||
    !frameLayout
  ) {
    return null;
  }

  const framePoint = resolveFrameAnchor(frameLayout);

  return createPortal(
    <svg
      className="pointer-events-none fixed inset-0 z-[33]"
      aria-hidden
      data-globe-context-agent-connector
    >
      <defs>
        <linearGradient id="rimvio-context-agent-link" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0071e3" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#86868b" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <line
        x1={pinAnchor.x}
        y1={pinAnchor.y}
        x2={framePoint.x}
        y2={framePoint.y}
        stroke="url(#rimvio-context-agent-link)"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        strokeLinecap="round"
      />
      <circle cx={pinAnchor.x} cy={pinAnchor.y} r={4} fill="#0071e3" fillOpacity={0.85} />
      <circle cx={framePoint.x} cy={framePoint.y} r={3.5} fill="#86868b" fillOpacity={0.7} />
    </svg>,
    document.body,
  );
}
