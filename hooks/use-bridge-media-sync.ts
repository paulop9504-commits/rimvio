"use client";

import { useCallback, useEffect, useRef } from "react";
import { syncAllBridgeSharedMedia } from "@/lib/experience-bridge/sync-all-bridge-shared-media";
import { EXPERIENCE_BRIDGE_UPDATED } from "@/lib/experience-bridge/local-bridge-store";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { shouldSkipGlobeFetch } from "@/lib/globe/globe-fetch-min-interval";

const POLL_MS = 90_000;
const ACTIVE_POLL_MS = 30_000;
const REFRESH_DEBOUNCE_MS = 4_000;
const MIN_FULL_SYNC_MS = 45_000;

/** Background poll — friend/host bridge photos sync without app restart. */
export function useBridgeMediaSync(input?: {
  enabled?: boolean;
  /** Active map pin / open sheet — poll faster. */
  priorityEventId?: string | null;
}) {
  const enabled = input?.enabled ?? true;
  const priorityEventIdRef = useRef(input?.priorityEventId?.trim() || null);
  priorityEventIdRef.current = input?.priorityEventId?.trim() || null;

  const { user, configured } = useAuth();
  const remote = configured && isSupabaseConfigured() && Boolean(user?.id);
  const syncingRef = useRef(false);

  const sync = useCallback(async () => {
    if (!enabled || !remote || syncingRef.current) {
      return 0;
    }
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return 0;
    }
    if (shouldSkipGlobeFetch("globe:bridge-media-full-sync", MIN_FULL_SYNC_MS)) {
      return 0;
    }
    syncingRef.current = true;
    try {
      return await syncAllBridgeSharedMedia({
        viewerUserId: user?.id,
        priorityEventId: priorityEventIdRef.current,
      });
    } catch {
      return 0;
    } finally {
      syncingRef.current = false;
    }
  }, [enabled, remote, user?.id]);

  useEffect(() => {
    if (!remote || !enabled) {
      return;
    }
    const timer = window.setTimeout(() => {
      void sync();
    }, 3_000);
    return () => window.clearTimeout(timer);
  }, [remote, enabled, sync]);

  useEffect(() => {
    if (!remote || !enabled) {
      return;
    }
    let debounceTimer: number | null = null;
    const onRefresh = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void sync();
      }, REFRESH_DEBOUNCE_MS);
    };
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);
    window.addEventListener(EXPERIENCE_BRIDGE_UPDATED, onRefresh);
    return () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
      window.removeEventListener(EXPERIENCE_BRIDGE_UPDATED, onRefresh);
    };
  }, [remote, enabled, sync]);

  useEffect(() => {
    if (!remote || !enabled || typeof document === "undefined") {
      return;
    }

    let timer: number | null = null;

    const arm = () => {
      if (timer != null) {
        window.clearInterval(timer);
        timer = null;
      }
      if (document.visibilityState === "hidden") {
        return;
      }
      const intervalMs = priorityEventIdRef.current ? ACTIVE_POLL_MS : POLL_MS;
      timer = window.setInterval(() => void sync(), intervalMs);
    };

    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      if (timer != null) {
        window.clearInterval(timer);
      }
      document.removeEventListener("visibilitychange", arm);
    };
  }, [remote, enabled, sync, input?.priorityEventId]);

  return { sync };
}
