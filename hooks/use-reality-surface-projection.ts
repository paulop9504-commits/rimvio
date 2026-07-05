"use client";

import { useCallback, useMemo, useState } from "react";
import { gateOperatorRequest } from "@/lib/operator";
import type { GlobeIngressCompileResult } from "@/lib/globe-ingress/types";
import {
  advanceRealitySurfaceDestination,
  blueprintNeedsDestination,
  composeRealitySurfaceFromGlobeIngress,
  resolveDestinationFromMessage,
  type RealitySurfaceProjectionBundle,
  type RealitySurfaceSession,
} from "@/lib/reality-surface";

export type UseRealitySurfaceProjectionResult = {
  session: RealitySurfaceSession | null;
  projection: RealitySurfaceProjectionBundle | null;
  activeEventId: string | null;
  setFromGlobeIngress: (input: {
    compiled: GlobeIngressCompileResult;
    eventId: string;
  }) => void;
  advanceDestination: (destinationLabel: string) => RealitySurfaceSession | null;
  tryAdvanceDestinationFromMessage: (
    message: string,
  ) => { destination: string; session: RealitySurfaceSession } | null;
  clearSession: () => void;
  gateOperatorMessage: (message: string) => ReturnType<typeof gateOperatorRequest> | null;
};

export function useRealitySurfaceProjection(): UseRealitySurfaceProjectionResult {
  const [session, setSession] = useState<RealitySurfaceSession | null>(null);

  const setFromGlobeIngress = useCallback(
    (input: { compiled: GlobeIngressCompileResult; eventId: string }) => {
      setSession(composeRealitySurfaceFromGlobeIngress(input));
    },
    [],
  );

  const advanceDestination = useCallback((destinationLabel: string) => {
    let advanced: RealitySurfaceSession | null = null;
    setSession((current) => {
      if (!current) {
        return current;
      }
      if (!blueprintNeedsDestination(current.operatorBlueprint)) {
        return current;
      }
      advanced = advanceRealitySurfaceDestination({
        session: current,
        destinationLabel,
      });
      return advanced;
    });
    return advanced;
  }, []);

  const tryAdvanceDestinationFromMessage = useCallback(
    (message: string) => {
      if (!session || !blueprintNeedsDestination(session.operatorBlueprint)) {
        return null;
      }
      const destination = resolveDestinationFromMessage(message);
      if (!destination) {
        return null;
      }
      const advanced = advanceRealitySurfaceDestination({
        session,
        destinationLabel: destination,
      });
      setSession(advanced);
      return { destination, session: advanced };
    },
    [session],
  );

  const clearSession = useCallback(() => {
    setSession(null);
  }, []);

  const gateOperatorMessage = useCallback(
    (message: string) => {
      if (!session?.operatorBlueprint) {
        return null;
      }
      return gateOperatorRequest({
        blueprint: session.operatorBlueprint,
        userMessage: message,
        activeNodeId: session.projection.runtime?.activeFlowNodeId ?? null,
      });
    },
    [session],
  );

  const projection = useMemo(() => session?.projection ?? null, [session]);

  return {
    session,
    projection,
    activeEventId: session?.eventId ?? null,
    setFromGlobeIngress,
    advanceDestination,
    tryAdvanceDestinationFromMessage,
    clearSession,
    gateOperatorMessage,
  };
}
