"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useActionCalendar } from "@/hooks/use-action-calendar";
import { useMorningUnlockSession } from "@/hooks/use-morning-unlock-session";
import { useRealtimeSurfaceComposition } from "@/hooks/use-realtime-surface-composition";
import { readClientMasterOrchestratorContext } from "@/lib/action-chat/client-master-context";
import {
  dismissMorningPrepForDate,
  readMorningPrepDismissDateKey,
  resolveMorningAutoPrepSurface,
  type MorningAutoPrepDecision,
} from "@/lib/morning-loop";
import { buildRuleBasedMorningBriefing } from "@/lib/morning-orchestrator/parse-morning-response";
import { resolveMorningContext } from "@/lib/morning-orchestrator/resolve-morning-context";
import type { MorningBriefingWire } from "@/lib/morning-orchestrator/types";
import { useSurfaceMemory } from "@/hooks/use-surface-memory";

export type MorningAutoPrepSurfaceState = MorningAutoPrepDecision & {
  prepSurface: ReturnType<typeof useActionCalendar>["prepSurface"];
  briefing: MorningBriefingWire | null;
  briefingLoading: boolean;
  dismiss: () => void;
  dominantLoop: ReturnType<typeof useRealtimeSurfaceComposition>["dominantLoop"];
};

export function useMorningAutoPrepSurface(): MorningAutoPrepSurfaceState {
  const unlock = useMorningUnlockSession();
  const masterContext = useMemo(() => readClientMasterOrchestratorContext(), []);
  const surfaceMemory = useSurfaceMemory();
  const [dismissTick, setDismissTick] = useState(0);
  const [briefing, setBriefing] = useState<MorningBriefingWire | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  const surfaceState = useRealtimeSurfaceComposition(
    {
      dateKey: masterContext.currentDate,
      context: {
        now: new Date(),
        completedActionIds: surfaceMemory.completedActionIds,
        dismissedSurfaceIds: surfaceMemory.dismissedSurfaceIds,
      },
    },
    {
      isForeground: true,
      firstUnlockToday: unlock.firstUnlockToday,
      localTime: unlock.localTime,
    },
  );

  const { prepSurface } = useActionCalendar({
    messages: [],
    linkIds: [],
  });

  const decision = useMemo(() => {
    void dismissTick;
    return resolveMorningAutoPrepSurface({
      dominantLoop: surfaceState.dominantLoop,
      firstUnlockToday: unlock.firstUnlockToday,
      prepSurfaceVisible: prepSurface.visible,
      dismissedForDateKey: readMorningPrepDismissDateKey(),
      dateKey: unlock.dateKey,
    });
  }, [
    dismissTick,
    surfaceState.dominantLoop,
    unlock.firstUnlockToday,
    unlock.dateKey,
    prepSurface.visible,
  ]);

  useEffect(() => {
    if (!decision.visible) {
      setBriefing(null);
      setBriefingLoading(false);
      return;
    }

    let cancelled = false;
    setBriefingLoading(true);

    void resolveMorningContext({
      message: "jarvis",
      referenceDate: masterContext.currentDate,
      tone: "jarvis",
      hour: unlock.localTime.hour,
      existingSchedule: masterContext.existingSchedule,
    })
      .then((bundle) => {
        if (cancelled) {
          return;
        }
        setBriefing(buildRuleBasedMorningBriefing(bundle));
      })
      .catch(() => {
        if (!cancelled) {
          setBriefing(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBriefingLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    decision.visible,
    masterContext.currentDate,
    masterContext.existingSchedule,
    unlock.localTime.hour,
  ]);

  const dismiss = useCallback(() => {
    dismissMorningPrepForDate(unlock.dateKey);
    setDismissTick((value) => value + 1);
  }, [unlock.dateKey]);

  return {
    ...decision,
    prepSurface,
    briefing,
    briefingLoading,
    dismiss,
    dominantLoop: surfaceState.dominantLoop,
  };
}
