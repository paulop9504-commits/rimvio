"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readClientMasterOrchestratorContext } from "@/lib/action-chat/client-master-context";
import { useMorningUnlockSession } from "@/hooks/use-morning-unlock-session";
import {
  buildEventHorizonSnapshotForClient,
  resolveEventHorizonPush,
  type EventHorizonPushDecision,
} from "@/lib/event-horizon/resolve-event-horizon-push";
import {
  dismissEventHorizonPushForDate,
  readEventHorizonPushDismissDateKey,
} from "@/lib/event-horizon/event-horizon-push-dismiss-store";
import { tryConsumeEventHorizonPushSlot } from "@/lib/event-horizon/daily-nudge-cap-store";
import { readMorningPrepDismissDateKey } from "@/lib/morning-loop/morning-prep-dismiss-store";
import { resolveMorningAutoPrepSurface } from "@/lib/morning-loop/resolve-morning-auto-prep";
import { readRealtimeState } from "@/lib/realtime/realtime-state-store";

export type EventHorizonPushState = EventHorizonPushDecision & {
  dismiss: () => void;
};

const PUSH_DELAY_MS = 4_000;

/**
 * Guardian event-horizon push — outside chat, max 1/day, Jarvis copy SSOT.
 */
export function useEventHorizonPush(): EventHorizonPushState {
  const masterContext = useMemo(() => readClientMasterOrchestratorContext(), []);
  const unlock = useMorningUnlockSession();
  const [dismissTick, setDismissTick] = useState(0);
  const [armed, setArmed] = useState(false);
  const [slotConsumed, setSlotConsumed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setArmed(true), PUSH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [masterContext.currentDate]);

  const morningAutoPrepVisible = useMemo(() => {
    const dominantLoop = readRealtimeState()?.activeLoop?.loopType ?? null;
    return resolveMorningAutoPrepSurface({
      dominantLoop,
      firstUnlockToday: unlock.firstUnlockToday,
      prepSurfaceVisible: false,
      dismissedForDateKey: readMorningPrepDismissDateKey(),
      dateKey: unlock.dateKey,
    }).visible;
  }, [unlock.firstUnlockToday, unlock.dateKey]);

  const decision = useMemo(() => {
    void dismissTick;
    if (!armed) {
      return {
        visible: false,
        reason: "morning_unlock_suppressed" as const,
        insightKind: null,
        copy: null,
      };
    }

    const snapshot = buildEventHorizonSnapshotForClient({
      context: masterContext,
    });

    return resolveEventHorizonPush({
      snapshot,
      dateKey: masterContext.currentDate,
      dismissedForDateKey: readEventHorizonPushDismissDateKey(),
      suppressForMorningUnlock: morningAutoPrepVisible,
      tone: "jarvis",
    });
  }, [
    armed,
    dismissTick,
    masterContext,
    morningAutoPrepVisible,
  ]);

  useEffect(() => {
    if (!decision.visible || slotConsumed) {
      return;
    }
    if (tryConsumeEventHorizonPushSlot(masterContext.currentDate)) {
      setSlotConsumed(true);
    }
  }, [decision.visible, slotConsumed, masterContext.currentDate]);

  const dismiss = useCallback(() => {
    dismissEventHorizonPushForDate(masterContext.currentDate);
    setDismissTick((value) => value + 1);
  }, [masterContext.currentDate]);

  const visible = decision.visible && slotConsumed;

  return {
    ...decision,
    visible,
    dismiss,
  };
}
