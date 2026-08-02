"use client";

/**
 * Callout resolves by objectId only — session supplies graph + handlers.
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type {
  CalloutHandlers,
  CalloutViewModel,
  RimvioObject,
} from "@/lib/callout/types";
import {
  buildCalloutViewModel,
  type CalloutGraphAlternative,
  type CalloutGraphNeighbor,
} from "@/lib/callout/build-callout-model";
import type {
  ObjectRelation,
  ObjectRelationType,
} from "@/lib/callout/object-relation";
import type {
  ReservationDateRange,
  ReservationDraft,
  ReservationPrice,
} from "@/lib/callout/prepare/types";
import type { SimulationItineraryAnchor } from "@/lib/callout/simulation/types";

export type CalloutSessionValue = {
  readonly contextId: string;
  readonly getObject: (objectId: string) => RimvioObject | null;
  readonly getNeighbors: (objectId: string) => readonly CalloutGraphNeighbor[];
  readonly getAlternatives: (
    objectId: string,
  ) => readonly CalloutGraphAlternative[];
  readonly getRelationBuckets: (
    objectId: string,
  ) => Record<ObjectRelationType, readonly ObjectRelation[]>;
  readonly getSimulationAnchors?: () => readonly SimulationItineraryAnchor[];
  readonly getPrepareDraft?: (objectId: string) => ReservationDraft | null;
  readonly getPrepareDateRange?: () => ReservationDateRange;
  readonly getPrepareGuestCount?: () => number;
  readonly getPreparePrice?: (objectId: string) => ReservationPrice;
  readonly handlers: CalloutHandlers;
};

const CalloutSessionContext = createContext<CalloutSessionValue | null>(null);

export function CalloutSessionProvider({
  value,
  children,
}: {
  value: CalloutSessionValue;
  children: ReactNode;
}) {
  return (
    <CalloutSessionContext.Provider value={value}>
      {children}
    </CalloutSessionContext.Provider>
  );
}

export function useCalloutSession(): CalloutSessionValue | null {
  return useContext(CalloutSessionContext);
}

export function useCalloutViewModel(objectId: string): CalloutViewModel | null {
  const session = useCalloutSession();
  return useMemo(() => {
    if (!session) return null;
    const object = session.getObject(objectId);
    if (!object) return null;
    return buildCalloutViewModel({
      object,
      neighbors: session.getNeighbors(objectId),
      alternatives: session.getAlternatives(objectId),
      relationBuckets: session.getRelationBuckets(objectId),
      simulationAnchors: session.getSimulationAnchors?.() ?? [],
      prepareDraft: session.getPrepareDraft?.(objectId) ?? null,
      prepareDateRange: session.getPrepareDateRange?.() ?? null,
      prepareGuestCount: session.getPrepareGuestCount?.() ?? null,
      preparePrice: session.getPreparePrice?.(objectId) ?? null,
    });
  }, [session, objectId]);
}

export function useCalloutHandlers(): CalloutHandlers {
  return useCalloutSession()?.handlers ?? {};
}
