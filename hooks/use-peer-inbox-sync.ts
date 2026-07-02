"use client";

import { useEffect, useRef } from "react";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { shouldSkipGlobeFetch } from "@/lib/globe/globe-fetch-min-interval";

const PEER_INBOX_POLL_MS = 25_000;
const PEER_MESSAGES_TABLE = "peer_messages";
const MIN_REFRESH_MS = 8_000;

/** Background inbox refresh — list preview + unread without opening each room. */
export function usePeerInboxSync(input: {
  enabled: boolean;
  onRefresh: () => void | Promise<void>;
}): void {
  const onRefreshRef = useRef(input.onRefresh);

  useEffect(() => {
    onRefreshRef.current = input.onRefresh;
  }, [input.onRefresh]);

  useEffect(() => {
    if (!input.enabled || typeof window === "undefined") {
      return;
    }

    const refresh = () => {
      if (shouldSkipGlobeFetch("peer:inbox-sync", MIN_REFRESH_MS)) {
        return;
      }
      void onRefreshRef.current();
    };

    const initialTimer = window.setTimeout(refresh, 1_500);

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
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [input.enabled]);

  useEffect(() => {
    if (!input.enabled || !isSupabaseConfigured() || typeof window === "undefined") {
      return;
    }

    const supabase = tryCreateClient();
    if (!supabase) {
      return;
    }

    let debounceTimer: number | null = null;
    const onInsert = () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void onRefreshRef.current();
      }, 1_200);
    };

    const channel = supabase
      .channel("peer-inbox-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: PEER_MESSAGES_TABLE,
        },
        onInsert,
      )
      .subscribe();

    return () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      void supabase.removeChannel(channel);
    };
  }, [input.enabled]);
}
