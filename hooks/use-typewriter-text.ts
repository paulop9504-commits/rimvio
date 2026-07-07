"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export type UseTypewriterTextOptions = {
  /** Characters per second. */
  cps?: number;
  enabled?: boolean;
};

/**
 * Progressive text reveal — respects prefers-reduced-motion.
 */
export function useTypewriterText(
  text: string,
  options?: UseTypewriterTextOptions,
) {
  const reducedMotion = useReducedMotion();
  const enabled = options?.enabled !== false && !reducedMotion;
  const cps = options?.cps ?? 44;
  const [displayed, setDisplayed] = useState(enabled ? "" : text);
  const [complete, setComplete] = useState(!enabled);

  useEffect(() => {
    const next = text.trim();
    if (!enabled) {
      setDisplayed(next);
      setComplete(true);
      return;
    }

    setDisplayed("");
    setComplete(false);
    if (!next) {
      setComplete(true);
      return;
    }

    let index = 0;
    const tickMs = Math.max(12, Math.round(1000 / cps));
    const intervalId = window.setInterval(() => {
      index += 1;
      setDisplayed(next.slice(0, index));
      if (index >= next.length) {
        window.clearInterval(intervalId);
        setComplete(true);
      }
    }, tickMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [cps, enabled, text]);

  return { displayed, complete };
}
