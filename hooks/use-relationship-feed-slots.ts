"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchRelationshipFeedSlots } from "@/lib/peer-chat/peer-chat-client";
import { totalFeedSlotUnread } from "@/lib/peer-chat/relationship-slots-server";
import { FEED_SLOTS_REFRESH_EVENT } from "@/lib/feed/feed-slots-events";
import type { RelationshipFeedSlot } from "@/lib/social/relationship-slot-types";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useRelationshipFeedSlots(enabled = true) {
  const { user, configured } = useAuth();
  const useRemote = Boolean(enabled && configured && user && isSupabaseConfigured());
  const [slots, setSlots] = useState<RelationshipFeedSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!useRemote) {
      setSlots([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchRelationshipFeedSlots();
      setSlots(data.slots);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [useRemote]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!useRemote) {
      return;
    }
    const onFocus = () => {
      void refresh();
    };
    const onFeedRefresh = () => {
      void refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(FEED_SLOTS_REFRESH_EVENT, onFeedRefresh);
    document.addEventListener("visibilitychange", onVisible);
    const poll = window.setInterval(() => {
      void refresh();
    }, 20_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(FEED_SLOTS_REFRESH_EVENT, onFeedRefresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(poll);
    };
  }, [useRemote, refresh]);

  return {
    slots,
    loading,
    unreadTotal: totalFeedSlotUnread(slots),
    refresh,
    useRemote,
  };
}
