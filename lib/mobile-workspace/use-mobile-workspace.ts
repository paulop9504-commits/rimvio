"use client";

import { useSyncExternalStore } from "react";
import {
  getMobileWorkspaceSnapshot,
  subscribeMobileWorkspace,
  type MobileWorkspaceState,
} from "@/lib/mobile-workspace";

export function useMobileWorkspace(): MobileWorkspaceState | null {
  return useSyncExternalStore(
    subscribeMobileWorkspace,
    getMobileWorkspaceSnapshot,
    getMobileWorkspaceSnapshot,
  );
}

/** Coarse pointer or narrow viewport → Mobile Workspace Interaction Model. */
export function usePreferMobileWorkspace(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(pointer: coarse), (max-width: 768px)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => {
      if (typeof window === "undefined") return true;
      return window.matchMedia("(pointer: coarse), (max-width: 768px)").matches;
    },
    () => true,
  );
}
