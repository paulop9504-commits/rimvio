"use client";

import { useEffect, useState } from "react";
import {
  subscribeGlobeLodgingDiscoveryReveal,
  subscribeGlobeLodgingDiscoveryStart,
} from "@/lib/globe/lodging/globe-lodging-discovery-bridge";
import { subscribeGlobeLodgingFocus } from "@/lib/globe/context-hub/globe-lodging-marker-bridge";

export type GlobeLodgingDiscoveryRevealState = {
  eventId: string | null;
  visibleResourceIds: ReadonlySet<string>;
  popInDelays: ReadonlyMap<string, number>;
};

const EMPTY: GlobeLodgingDiscoveryRevealState = {
  eventId: null,
  visibleResourceIds: new Set(),
  popInDelays: new Map(),
};

/** Filters lodging markers during staged pop-in after composer discovery. */
export function useGlobeLodgingDiscoveryReveal(
  focusedEventId: string | null | undefined,
): GlobeLodgingDiscoveryRevealState {
  const [state, setState] = useState<GlobeLodgingDiscoveryRevealState>(EMPTY);

  useEffect(() => {
    return subscribeGlobeLodgingDiscoveryStart((detail) => {
      setState({
        eventId: detail.eventId,
        visibleResourceIds: new Set(),
        popInDelays: new Map(),
      });
    });
  }, []);

  useEffect(() => {
    return subscribeGlobeLodgingDiscoveryReveal((detail) => {
      setState((prev) => {
        if (prev.eventId !== detail.eventId) {
          return prev;
        }
        const visibleResourceIds = new Set(prev.visibleResourceIds);
        visibleResourceIds.add(detail.resourceId);
        const popInDelays = new Map(prev.popInDelays);
        popInDelays.set(detail.resourceId, detail.index * 80);
        return { ...prev, visibleResourceIds, popInDelays };
      });
    });
  }, []);

  useEffect(() => {
    const eventId = focusedEventId?.trim() ?? null;
    if (!eventId) {
      return;
    }
    return subscribeGlobeLodgingFocus((detail) => {
      if (!detail.resourceId.startsWith(`${eventId}:`)) {
        return;
      }
      setState((prev) => {
        if (prev.eventId !== eventId) {
          return prev;
        }
        const visibleResourceIds = new Set(prev.visibleResourceIds);
        visibleResourceIds.add(detail.resourceId);
        const popInDelays = new Map(prev.popInDelays);
        if (!popInDelays.has(detail.resourceId)) {
          popInDelays.set(detail.resourceId, 0);
        }
        return { ...prev, visibleResourceIds, popInDelays };
      });
    });
  }, [focusedEventId]);

  useEffect(() => {
    const eventId = focusedEventId?.trim() ?? null;
    if (!eventId || state.eventId !== eventId) {
      return;
    }
    if (
      state.visibleResourceIds.size > 0 &&
      state.visibleResourceIds.size >= state.popInDelays.size
    ) {
      const timer = window.setTimeout(() => {
        setState(EMPTY);
      }, 2400);
      return () => window.clearTimeout(timer);
    }
  }, [focusedEventId, state]);

  const eventId = focusedEventId?.trim() ?? null;
  if (!eventId || state.eventId !== eventId || state.visibleResourceIds.size === 0) {
    return EMPTY;
  }

  return state;
}
