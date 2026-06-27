"use client";

import { useEffect, useState } from "react";
import {
  subscribeGlobeEateryDiscoveryReveal,
  subscribeGlobeEateryDiscoveryStart,
} from "@/lib/globe/eatery/globe-eatery-discovery-bridge";

export type GlobeEateryDiscoveryRevealState = {
  eventId: string | null;
  visibleResourceIds: ReadonlySet<string>;
  popInDelays: ReadonlyMap<string, number>;
};

const EMPTY: GlobeEateryDiscoveryRevealState = {
  eventId: null,
  visibleResourceIds: new Set(),
  popInDelays: new Map(),
};

/** Filters eatery markers during staged pop-in after composer discovery. */
export function useGlobeEateryDiscoveryReveal(
  focusedEventId: string | null | undefined,
): GlobeEateryDiscoveryRevealState {
  const [state, setState] = useState<GlobeEateryDiscoveryRevealState>(EMPTY);

  useEffect(() => {
    return subscribeGlobeEateryDiscoveryStart((detail) => {
      setState({
        eventId: detail.eventId,
        visibleResourceIds: new Set(),
        popInDelays: new Map(),
      });
    });
  }, []);

  useEffect(() => {
    return subscribeGlobeEateryDiscoveryReveal((detail) => {
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
