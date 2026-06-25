"use client";

import { useEffect } from "react";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const PEER_INBOX_POLL_MS = 10_000;
const PEER_MESSAGES_TABLE = "peer_messages";

/** Background inbox refresh — list preview + unread without opening each room. */
export function usePeerInboxSync(input: {
  enabled: boolean;
  onRefresh: () => void | Promise<void>;
}): void {
  const { enabled, onRefresh } = input;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const refresh = () => {
      void onRefresh();
    };

    refresh();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, PEER_INBOX_POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, onRefresh]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured() || typeof window === "undefined") {
      return;
    }

    const supabase = tryCreateClient();
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("peer-inbox-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: PEER_MESSAGES_TABLE,
        },
        () => {
          void onRefresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, onRefresh]);
}
