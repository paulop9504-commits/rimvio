"use client";

import { useEffect, useRef } from "react";
import { acquireTicketScanSurface } from "@/lib/globe/ticket-scan-surface";

/** Keeps screen awake and scan-surface styling while QR viewer is open. */
export function useTicketScanSurface(active: boolean) {
  const handleRef = useRef<Awaited<ReturnType<typeof acquireTicketScanSurface>> | null>(
    null,
  );

  useEffect(() => {
    if (!active) {
      handleRef.current?.release();
      handleRef.current = null;
      return;
    }

    let cancelled = false;
    void acquireTicketScanSurface().then((handle) => {
      if (cancelled) {
        handle.release();
        return;
      }
      handleRef.current?.release();
      handleRef.current = handle;
    });

    return () => {
      cancelled = true;
      handleRef.current?.release();
      handleRef.current = null;
    };
  }, [active]);
}
