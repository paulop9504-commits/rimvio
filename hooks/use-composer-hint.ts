"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ComposerHintTone = "neutral" | "success" | "error";

export type ComposerHintState = {
  text: string;
  tone: ComposerHintTone;
} | null;

export function useComposerHint() {
  const [hint, setHint] = useState<ComposerHintState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHint = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHint(null);
  }, []);

  const showHint = useCallback(
    (
      text: string,
      options?: { tone?: ComposerHintTone; durationMs?: number },
    ) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setHint({ text: trimmed, tone: options?.tone ?? "neutral" });
      const duration = options?.durationMs ?? 5000;
      if (duration > 0) {
        timerRef.current = setTimeout(() => {
          setHint(null);
          timerRef.current = null;
        }, duration);
      }
    },
    [],
  );

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  return { hint, showHint, clearHint };
}
