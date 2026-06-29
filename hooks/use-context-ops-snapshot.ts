"use client";

import { useCallback, useEffect, useState } from "react";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import { listConversationMemories } from "@/lib/conversation-memory/conversation-memory-store";
import type { ContextSnapshot } from "@/lib/dev/context-snapshot-types";
import type { ContextSnapshotServerPayload } from "@/lib/dev/context-snapshot-types";
import {
  buildContextOpsKpis,
  mergeClientContextSnapshot,
} from "@/lib/dev/merge-client-context-snapshot";
import { listPersonalGlobePins } from "@/lib/globe/personal-globe-pin-store";
import { listLifeEventCandidates } from "@/lib/life-read-model";

type ApiPayload = {
  ok: boolean;
  server?: ContextSnapshotServerPayload;
  error?: string;
};

export type ContextOpsKpis = ReturnType<typeof buildContextOpsKpis>;

export function useContextOpsSnapshot(pollMs = 30_000) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ContextSnapshot | null>(null);
  const [kpis, setKpis] = useState<ContextOpsKpis | null>(null);
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dev/context-snapshot", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`snapshot ${response.status}`);
      }
      const payload = (await response.json()) as ApiPayload;
      const events = listLifeEventCandidates();
      const merged = mergeClientContextSnapshot(payload.server, {
        events,
        contacts: readPeerContacts(),
        conversationMemories: listConversationMemories(40).map((item) => ({
          id: item.id,
          topic: item.topic,
          summary: item.summary,
          keywords: item.keywords,
          createdAt: item.createdAt,
        })),
        localPinEventIds: listPersonalGlobePins()
          .map((pin) => pin.eventId?.trim())
          .filter((id): id is string => Boolean(id)),
      });

      setSnapshot(merged);
      setKpis(buildContextOpsKpis(merged, events));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "load_failed");
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
    error,
    snapshot,
    kpis,
    refresh: () => setRevision((value) => value + 1),
  };
}
