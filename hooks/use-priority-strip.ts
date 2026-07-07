"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_PRIORITY_STRIP_ITEMS } from "@/lib/globe/priority-strip";
import type { PriorityStripItem, PriorityStripPayload } from "@/lib/globe/priority-strip";
import { fetchPriorityStrip } from "@/lib/globe/fetch-priority-strip";

const DEFAULT_POLL_MS = 20_000;
const VISIBILITY_REFRESH_MS = 45_000;

type UsePriorityStripOptions = {
  /** When false, no network fetch (globe chat / portal open). */
  enabled?: boolean;
  limit?: number;
  pollMs?: number;
  runId?: string | null;
  autoRefresh?: boolean;
};

type UsePriorityStripResult = {
  payload: PriorityStripPayload | null;
  items: readonly PriorityStripItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

function isJsonPriorityStripUnexpectedContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }
  const normalized = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  return normalized.length > 0 && normalized !== "application/json";
}

export function usePriorityStrip(
  options: UsePriorityStripOptions = {},
): UsePriorityStripResult {
  const enabled = options.enabled !== false;
  const limit = options.limit ?? MAX_PRIORITY_STRIP_ITEMS;
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const runId = options.runId ?? null;
  const autoRefresh = options.autoRefresh !== false;

  const [payload, setPayload] = useState<PriorityStripPayload | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const visibilityLastFetchAtRef = useRef(0);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }
    if (inFlightRef.current) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    inFlightRef.current = true;
    setIsLoading((current) => current || payload === null);
    setError(null);

    try {
      const next = await fetchPriorityStrip({
        limit,
        runId,
      });
      if (requestIdRef.current !== requestId) {
        return;
      }
      setPayload(next);
      visibilityLastFetchAtRef.current = Date.now();
    } catch (caught) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      const message =
        caught instanceof Error ? caught.message : "Unable to load priority strip";
      setError(message);
      if (isJsonPriorityStripUnexpectedContentType(message)) {
        const stalePayload = payload;
        if (stalePayload) {
          setPayload({
            ...stalePayload,
            backedBy: "empty" as const,
          });
        }
      }
    } finally {
      inFlightRef.current = false;
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [enabled, limit, payload, runId]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    void refresh();
    if (!autoRefresh) {
      return;
    }

    const timer = window.setInterval(() => {
      void refresh();
    }, pollMs);

    const onVisible = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      if (Date.now() - visibilityLastFetchAtRef.current < VISIBILITY_REFRESH_MS) {
        return;
      }
      void refresh();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [autoRefresh, enabled, pollMs, refresh]);

  useEffect(() => {
    if (!enabled) {
      void refresh();
    }
  }, [enabled, refresh]);

  return {
    payload,
    items: payload?.items ?? [],
    isLoading,
    error,
    refresh,
  };
}
