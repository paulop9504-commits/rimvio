"use client";

/**
 * React subscription to CalloutWindow store (Interaction Layer).
 */

import { useCallback, useSyncExternalStore } from "react";
import {
  getCalloutWindowsSnapshot,
  getFocusedCalloutWindowId,
  subscribeCalloutWindows,
  type CalloutWindow,
} from "@/lib/callout/windows";

export function useCalloutWindows(): {
  readonly windows: readonly CalloutWindow[];
  readonly focusedWindowId: string | null;
} {
  const windows = useSyncExternalStore(
    subscribeCalloutWindows,
    getCalloutWindowsSnapshot,
    getCalloutWindowsSnapshot,
  );
  const focusedWindowId = useSyncExternalStore(
    subscribeCalloutWindows,
    getFocusedCalloutWindowId,
    getFocusedCalloutWindowId,
  );
  return { windows, focusedWindowId };
}

export function useCalloutWindowList(): readonly CalloutWindow[] {
  return useSyncExternalStore(
    subscribeCalloutWindows,
    getCalloutWindowsSnapshot,
    getCalloutWindowsSnapshot,
  );
}

export function useFocusedCalloutEntityId(): string | null {
  const get = useCallback(() => {
    const fid = getFocusedCalloutWindowId();
    if (!fid) return null;
    const w = getCalloutWindowsSnapshot().find((x) => x.id === fid);
    return w?.entityId ?? null;
  }, []);
  return useSyncExternalStore(subscribeCalloutWindows, get, get);
}
