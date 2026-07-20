"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "rimvio-context-assistant-shell-opacity";
export const CONTEXT_ASSISTANT_OPACITY_MIN = 0.4;
export const CONTEXT_ASSISTANT_OPACITY_MAX = 1;
export const CONTEXT_ASSISTANT_OPACITY_DEFAULT = 0.92;

function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return CONTEXT_ASSISTANT_OPACITY_DEFAULT;
  }
  return Math.min(
    CONTEXT_ASSISTANT_OPACITY_MAX,
    Math.max(CONTEXT_ASSISTANT_OPACITY_MIN, value),
  );
}

function readStoredOpacity(): number {
  if (typeof window === "undefined") {
    return CONTEXT_ASSISTANT_OPACITY_DEFAULT;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return CONTEXT_ASSISTANT_OPACITY_DEFAULT;
    }
    return clampOpacity(Number.parseFloat(raw));
  } catch {
    return CONTEXT_ASSISTANT_OPACITY_DEFAULT;
  }
}

/** Shell transparency for Context AI PromptFrame — hydrated after mount (#418). */
export function useContextAssistantShellOpacity() {
  const [opacity, setOpacityState] = useState(CONTEXT_ASSISTANT_OPACITY_DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOpacityState(readStoredOpacity());
    setHydrated(true);
  }, []);

  const setOpacity = (next: number) => {
    const clamped = clampOpacity(next);
    setOpacityState(clamped);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  };

  return { opacity, setOpacity, hydrated };
}
