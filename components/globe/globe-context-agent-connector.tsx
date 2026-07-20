"use client";

import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { useGlobePinScreenAnchor } from "@/hooks/use-globe-pin-screen-anchor";
import { RIMVIO_ACTION, RIMVIO_INK } from "@/lib/design/rimvio-ontology";
import {
  isGlobeComposeInputFocused,
  subscribeGlobeComposeInputFocus,
} from "@/lib/globe/compose-input-focus";
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

function frameLayoutEqual(
  left: GlobeInfoFrameLayout | null,
  right: GlobeInfoFrameLayout | null,
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    left.left === right.left &&
    left.top === right.top &&
    left.width === right.width &&
    left.height === right.height
  );
}

function isComposeInputFocused(): boolean {
  if (isGlobeComposeInputFocused()) {
    return true;
  }
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) {
    return false;
  }
  return Boolean(
    active.closest("[data-globe-context-condition-compose-input]") ||
      active.closest("[data-globe-context-condition-pin-bar]"),
  );
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
  const [composeFocused, setComposeFocused] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!visible) {
      setComposeFocused(false);
      return;
    }
    const syncFocus = () => {
      setComposeFocused(isComposeInputFocused());
    };
    syncFocus();
    document.addEventListener("focusin", syncFocus);
    document.addEventListener("focusout", syncFocus);
    const unsub = subscribeGlobeComposeInputFocus(syncFocus);
    return () => {
      document.removeEventListener("focusin", syncFocus);
      document.removeEventListener("focusout", syncFocus);
      unsub();
    };
  }, [visible]);

  const pinAnchor = useGlobePinScreenAnchor({
    globeRef,
    lat: pinLat,
    lng: pinLng,
    // Freeze pin projection while IME owns the main thread.
    enabled: visible && !composeFocused,
  });

  useEffect(() => {
    if (!visible || composeFocused) {
      return;
    }
    let last: GlobeInfoFrameLayout | null = null;
    const tick = () => {
      const next = readGlobeInfoFrameLayout("context-condition-prompt");
      if (frameLayoutEqual(last, next)) {
        return;
      }
      last = next;
      setFrameLayout(next);
    };
    tick();
    // 4fps is enough for a decorative line; 15fps was starving Korean IME.
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [visible, composeFocused]);

  if (
    !mounted ||
    !visible ||
    composeFocused ||
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
          <stop offset="0%" stopColor={RIMVIO_ACTION.primary} stopOpacity="0.55" />
          <stop offset="100%" stopColor={RIMVIO_INK.secondary} stopOpacity="0.35" />
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
      <circle cx={pinAnchor.x} cy={pinAnchor.y} r={4} fill={RIMVIO_ACTION.primary} fillOpacity={0.85} />
      <circle cx={framePoint.x} cy={framePoint.y} r={3.5} fill={RIMVIO_INK.secondary} fillOpacity={0.7} />
    </svg>,
    document.body,
  );
}
