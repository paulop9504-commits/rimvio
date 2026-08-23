"use client";

import { useEffect, useMemo, useState } from "react";
import { readClientMasterOrchestratorContext } from "@/lib/action-chat/client-master-context";
import { consumeFirstUnlockToday } from "@/lib/morning-loop/first-unlock-store";

export type MorningUnlockSession = {
  dateKey: string;
  firstUnlockToday: boolean;
  localTime: { hour: number; minute: number };
};

/**
 * First foreground open of the local day — feeds MORNING_LOOP `first_unlock`.
 */
export function useMorningUnlockSession(): MorningUnlockSession {
  const masterContext = useMemo(() => readClientMasterOrchestratorContext(), []);
  const [firstUnlockToday, setFirstUnlockToday] = useState(false);

  useEffect(() => {
    const consumed = consumeFirstUnlockToday(masterContext.currentDate);
    setFirstUnlockToday(consumed);
  }, [masterContext.currentDate]);

  const now = new Date();
  return {
    dateKey: masterContext.currentDate,
    firstUnlockToday,
    localTime: { hour: now.getHours(), minute: now.getMinutes() },
  };
}
