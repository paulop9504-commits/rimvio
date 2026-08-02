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

export type CalloutSessionValue = {
  readonly contextId: string;
  readonly getObject: (objectId: string) => RimvioObject | null;
  readonly getNeighbors: (objectId: string) => readonly CalloutGraphNeighbor[];
  readonly getAlternatives: (
    objectId: string,
  ) => readonly CalloutGraphAlternative[];
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
    });
  }, [session, objectId]);
}

export function useCalloutHandlers(): CalloutHandlers {
  return useCalloutSession()?.handlers ?? {};
}
