"use client";

import { useCallback, useEffect, useState } from "react";
import type { SelfLearningSummary } from "@/lib/dev/summarize-self-learning";

type ApiPayload = {
  ok: boolean;
  summary?: SelfLearningSummary;
};

export function useSelfLearningSummary(pollMs = 30_000) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SelfLearningSummary | null>(null);
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dev/self-learning-summary", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`summary ${response.status}`);
      }
      const payload = (await response.json()) as ApiPayload;
      setSummary(payload.summary ?? null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, revision]);

  useEffect(() => {
    if (pollMs <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setRevision((value) => value + 1);
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs]);

  return {
    loading,
    summary,
    refresh: () => setRevision((value) => value + 1),
  };
}
