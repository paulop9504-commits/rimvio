"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ExperienceBridgeParticipant,
  ExperienceBridgeState,
} from "@/lib/experience-bridge/experience-bridge-types";
import { fetchPendingBridgeInvitesRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { EXPERIENCE_BRIDGE_UPDATED } from "@/lib/experience-bridge/local-bridge-store";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type PendingBridgeInvite = {
  state: ExperienceBridgeState;
  invite: ExperienceBridgeParticipant;
};

const POLL_MS = 12_000;

export function usePendingBridgeInvites(enabled = true) {
  const { user, configured } = useAuth();
  const remote = configured && isSupabaseConfigured() && Boolean(user?.id);

  const [invites, setInvites] = useState<PendingBridgeInvite[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !remote) {
      setInvites([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPendingBridgeInvitesRemote();
      setInvites(data.invites ?? []);
    } catch {
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, remote]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!remote) {
      return;
    }
    const onRefresh = () => void refresh();
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);
    window.addEventListener(EXPERIENCE_BRIDGE_UPDATED, onRefresh);
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
      window.removeEventListener(EXPERIENCE_BRIDGE_UPDATED, onRefresh);
      window.clearInterval(timer);
    };
  }, [remote, refresh]);

  const dismissInvite = useCallback((eventId: string) => {
    setInvites((rows) => rows.filter((row) => row.state.bridge.eventId !== eventId));
  }, []);

  return {
    invites,
    loading,
    refresh,
    dismissInvite,
    hasInvites: invites.length > 0,
  };
}
