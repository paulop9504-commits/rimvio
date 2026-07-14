"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { gateOperatorRequest } from "@/lib/operator";
import {
  needsContextExecutionPlanApproval,
  needsContextExecutionStepApproval,
  offerPlanStepHandoffAfterAdvance,
  persistContextExecutionPlanClientAsync,
  preferFresherExecutionPlan,
  readContextExecutionPlanFromEvent,
} from "@/lib/context-execution";
import { syncContextInstalledEnginesFromBlueprintClient } from "@/lib/engine/sync-installed-engines-from-blueprint-client";
import { copy } from "@/lib/copy/human-ko";
import type { GlobeIngressCompileResult } from "@/lib/globe-ingress/types";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import {
  advanceRealitySurfaceDepartureHub,
  advanceRealitySurfaceDestination,
  approveRealitySurfaceExecutionPlan,
  blueprintNeedsDepartureConfirm,
  blueprintNeedsDestination,
  composeRealitySurfaceFromGlobeIngress,
  resolveDestinationFromMessage,
  type RealitySurfaceProjectionBundle,
  type RealitySurfaceSession,
} from "@/lib/reality-surface";
import type { DepartureHubAirport } from "@/lib/globe/departure-hub-airports";

function persistBlueprintEngineSync(session: RealitySurfaceSession): void {
  void syncContextInstalledEnginesFromBlueprintClient({
    contextEventId: session.eventId,
    blueprint: session.operatorBlueprint,
  });
}

function persistExecutionPlanSync(session: RealitySurfaceSession): void {
  if (!session.executionPlan) {
    return;
  }
  void persistContextExecutionPlanClientAsync({
    contextEventId: session.eventId,
    plan: session.executionPlan,
  });
}

/** Merge Event SSOT plan (engine turns → prepared) into session. */
function mergeSessionPlanFromEvent(
  session: RealitySurfaceSession,
): RealitySurfaceSession {
  const event = findLifeEventCandidate(session.eventId);
  const fromEvent = readContextExecutionPlanFromEvent(event);
  const executionPlan = preferFresherExecutionPlan(
    session.executionPlan,
    fromEvent,
  );
  if (
    !executionPlan ||
    executionPlan.updatedAtIso === session.executionPlan?.updatedAtIso
  ) {
    return session;
  }
  return { ...session, executionPlan };
}

export type UseRealitySurfaceProjectionResult = {
  session: RealitySurfaceSession | null;
  projection: RealitySurfaceProjectionBundle | null;
  activeEventId: string | null;
  setFromGlobeIngress: (input: {
    compiled: GlobeIngressCompileResult;
    eventId: string;
  }) => void;
  advanceDestination: (destinationLabel: string) => RealitySurfaceSession | null;
  confirmDepartureHub: (input: {
    hub: DepartureHubAirport;
    homeLabel: string;
    homeLat?: number | null;
    homeLng?: number | null;
  }) => RealitySurfaceSession | null;
  tryAdvanceDestinationFromMessage: (
    message: string,
  ) => { destination: string; session: RealitySurfaceSession } | null;
  clearSession: () => void;
  approveExecutionPlan: () => RealitySurfaceSession | null;
  gateOperatorMessage: (message: string) => ReturnType<typeof gateOperatorRequest> | null;
};

export function useRealitySurfaceProjection(): UseRealitySurfaceProjectionResult {
  const [session, setSession] = useState<RealitySurfaceSession | null>(null);

  useEffect(() => {
    const sync = () => {
      setSession((current) => {
        if (!current) {
          return current;
        }
        return mergeSessionPlanFromEvent(current);
      });
    };
    window.addEventListener(EVENT_CANDIDATES_UPDATED, sync);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, sync);
  }, []);

  const setFromGlobeIngress = useCallback(
    (input: { compiled: GlobeIngressCompileResult; eventId: string }) => {
      const next = composeRealitySurfaceFromGlobeIngress(input);
      setSession(next);
      persistBlueprintEngineSync(next);
      persistExecutionPlanSync(next);
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
      if (advanced) {
        persistBlueprintEngineSync(advanced);
        persistExecutionPlanSync(advanced);
      }
      return advanced;
    });
    return advanced;
  }, []);

  const confirmDepartureHub = useCallback(
    (input: {
      hub: DepartureHubAirport;
      homeLabel: string;
      homeLat?: number | null;
      homeLng?: number | null;
    }) => {
      let advanced: RealitySurfaceSession | null = null;
      setSession((current) => {
        if (!current) {
          return current;
        }
        if (!blueprintNeedsDepartureConfirm(current.operatorBlueprint)) {
          return current;
        }
        advanced = advanceRealitySurfaceDepartureHub({
          session: current,
          hub: input.hub,
          homeLabel: input.homeLabel,
          homeLat: input.homeLat,
          homeLng: input.homeLng,
        });
        if (advanced) {
          persistBlueprintEngineSync(advanced);
          // Keep Execution Plan through departure confirm — then Auto enter domain.
          if (advanced.executionPlan) {
            void persistContextExecutionPlanClientAsync({
              contextEventId: advanced.eventId,
              plan: advanced.executionPlan,
            });
            offerPlanStepHandoffAfterAdvance({
              contextEventId: advanced.eventId,
              plan: advanced.executionPlan,
              userLat: input.homeLat,
              userLng: input.homeLng,
            });
          }
        }
        return advanced;
      });
      return advanced;
    },
    [],
  );

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
      persistBlueprintEngineSync(advanced);
      persistExecutionPlanSync(advanced);
      return { destination, session: advanced };
    },
    [session],
  );

  const clearSession = useCallback(() => {
    setSession(null);
  }, []);

  const approveExecutionPlan = useCallback((): RealitySurfaceSession | null => {
    if (!session?.executionPlan) {
      return null;
    }
    // Event may already be prepared from engine MAIN — merge before approve.
    const merged = mergeSessionPlanFromEvent(session);
    if (!merged.executionPlan) {
      return null;
    }
    const wasPlanGate = needsContextExecutionPlanApproval(merged.executionPlan);
    const wasStepGate = needsContextExecutionStepApproval(merged.executionPlan);
    const next = approveRealitySurfaceExecutionPlan(merged);
    if (
      next.executionPlan?.updatedAtIso === merged.executionPlan.updatedAtIso
    ) {
      if (
        merged.executionPlan.updatedAtIso !== session.executionPlan.updatedAtIso
      ) {
        setSession(merged);
      }
      return null;
    }
    setSession(next);
    persistExecutionPlanSync(next);
    persistBlueprintEngineSync(next);
    if (next.executionPlan) {
      offerPlanStepHandoffAfterAdvance({
        contextEventId: next.eventId,
        plan: next.executionPlan,
      });
      toast.success(
        wasPlanGate && !wasStepGate
          ? copy.globe.executionPlanPreview.approvedToast
          : copy.globe.executionPlanPreview.stepApprovedToast,
      );
    }
    return next;
  }, [session]);

  const gateOperatorMessage = useCallback(
    (message: string) => {
      if (!session?.operatorBlueprint) {
        return null;
      }
      return gateOperatorRequest({
        blueprint: session.operatorBlueprint,
        userMessage: message,
        activeNodeId: session.projection.runtime?.activeFlowNodeId ?? null,
        executionPlan: session.executionPlan ?? null,
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
    confirmDepartureHub,
    tryAdvanceDestinationFromMessage,
    clearSession,
    approveExecutionPlan,
    gateOperatorMessage,
  };
}
