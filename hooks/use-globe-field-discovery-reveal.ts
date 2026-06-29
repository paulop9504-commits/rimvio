"use client";

import { useEffect, useState } from "react";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import {
  marketIntentGlobePinId,
  subscribeFieldDiscoveryPinSession,
} from "@/lib/globe/opportunity-field/globe-field-discovery-bridge";
import { subscribeFieldPlacePinSession } from "@/lib/globe/opportunity-field/globe-field-place-discovery-bridge";
import {
  subscribeStagedPinRevealStart,
  subscribeStagedPinRevealTick,
} from "@/lib/globe/opportunity-field/staged-pin-reveal";

export type GlobeFieldDiscoveryRevealState = {
  active: boolean;
  contextId: string | null;
  sessionIntents: readonly MarketIntentRecord[];
  sessionPlaceClusters: readonly PinCluster[];
  visiblePinIds: ReadonlySet<string>;
  popInDelays: ReadonlyMap<string, number>;
  sessionSize: number;
};

const EMPTY: GlobeFieldDiscoveryRevealState = {
  active: false,
  contextId: null,
  sessionIntents: [],
  sessionPlaceClusters: [],
  visiblePinIds: new Set(),
  popInDelays: new Map(),
  sessionSize: 0,
};

/** Globe overlay while Field discovery tab stages market + place pins. */
export function useGlobeFieldDiscoveryReveal(): GlobeFieldDiscoveryRevealState {
  const [state, setState] = useState<GlobeFieldDiscoveryRevealState>(EMPTY);

  useEffect(() => {
    return subscribeFieldDiscoveryPinSession((detail) => {
      setState({
        active: true,
        contextId: detail.contextId,
        sessionIntents: detail.intents,
        sessionPlaceClusters: [],
        visiblePinIds: new Set(),
        popInDelays: new Map(),
        sessionSize: detail.intents.length,
      });
    });
  }, []);

  useEffect(() => {
    return subscribeFieldPlacePinSession((detail) => {
      setState({
        active: true,
        contextId: detail.contextId,
        sessionIntents: [],
        sessionPlaceClusters: detail.clusters,
        visiblePinIds: new Set(),
        popInDelays: new Map(),
        sessionSize: detail.clusters.length,
      });
    });
  }, []);

  useEffect(() => {
    return subscribeStagedPinRevealStart(() => {
      setState((prev) => ({
        ...prev,
        visiblePinIds: new Set(),
        popInDelays: new Map(),
      }));
    });
  }, []);

  useEffect(() => {
    return subscribeStagedPinRevealTick((detail) => {
      setState((prev) => {
        if (!prev.active) {
          return prev;
        }
        const visiblePinIds = new Set(prev.visiblePinIds);
        visiblePinIds.add(detail.id);
        const popInDelays = new Map(prev.popInDelays);
        popInDelays.set(detail.id, detail.index * 80);
        return { ...prev, visiblePinIds, popInDelays };
      });
    });
  }, []);

  useEffect(() => {
    if (!state.active || state.visiblePinIds.size === 0) {
      return;
    }
    if (state.sessionSize > 0 && state.visiblePinIds.size < state.sessionSize) {
      return;
    }
    const timer = window.setTimeout(() => {
      setState(EMPTY);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [state]);

  return state;
}

export function filterFieldRevealIntents(
  state: GlobeFieldDiscoveryRevealState,
): MarketIntentRecord[] {
  if (!state.active) {
    return [];
  }
  return state.sessionIntents.filter((intent) =>
    state.visiblePinIds.has(marketIntentGlobePinId(intent.id)),
  );
}

export function filterFieldRevealPlaceClusters(
  state: GlobeFieldDiscoveryRevealState,
): PinCluster[] {
  if (!state.active) {
    return [];
  }
  return state.sessionPlaceClusters.filter((cluster) =>
    state.visiblePinIds.has(cluster.pinId),
  );
}
