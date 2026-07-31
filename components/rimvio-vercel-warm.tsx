"use client";

/**
 * One warm ping after paint — Pro Fluid stays hot on icn1 for Workspace/search.
 */

import { useEffect } from "react";

const WARM_KEY = "rimvio.vercel.warm.v1";
const WARM_TTL_MS = 5 * 60_000;

export function RimvioVercelWarm() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(WARM_KEY);
      const last = raw ? Number(raw) : 0;
      if (Number.isFinite(last) && Date.now() - last < WARM_TTL_MS) {
        return;
      }
    } catch {
      // ignore
    }

    const run = () => {
      void fetch("/api/warm", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      })
        .then(() => {
          try {
            sessionStorage.setItem(WARM_KEY, String(Date.now()));
          } catch {
            // ignore
          }
        })
        .catch(() => {
          // ignore warm failures
        });
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 800);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
