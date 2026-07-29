"use client";

import { useSyncExternalStore } from "react";
import {
  readSessionState,
  subscribeSessionStateChange,
} from "@/lib/reality-state/session-state-store";
import type { UserSessionState } from "@/lib/reality-state/session-state";

let snapshot: UserSessionState = readSessionState();

function subscribe(onStoreChange: () => void): () => void {
  return subscribeSessionStateChange((s) => {
    snapshot = s;
    onStoreChange();
  });
}

function getSnapshot(): UserSessionState {
  return snapshot;
}

function getServerSnapshot(): UserSessionState {
  return readSessionState();
}

export function useSessionState(): UserSessionState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
