"use client";

/**
 * Realtime for Workspace invites + shared session sync (ADR-047).
 */

import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { tryCreateClient } from "@/lib/supabase/client";
import { EXPERIENCE_BRIDGE_UPDATED } from "@/lib/experience-bridge/local-bridge-store";
import {
  emitSharedWorkspaceSyncTick,
  listSharedWorkspaceSessions,
  SHARED_WORKSPACE_COMMITTED,
} from "@/lib/context-workspace/shared-workspace-session-store";
import { syncBridgeSharedMediaFromRemote } from "@/lib/experience-bridge/sync-bridge-participant-media";
import { notifyBridgeSharedMediaUpdated } from "@/lib/experience-bridge/notify-bridge-shared-media-updated";

function bumpBridgeUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EXPERIENCE_BRIDGE_UPDATED));
}

export function useSharedWorkspaceRealtimeSync(enabled = true): void {
  const { user, configured } = useAuth();
  const supabase = useMemo(
    () => (configured && isSupabaseConfigured() ? tryCreateClient() : null),
    [configured],
  );
  const userId = user?.id?.trim() ?? "";

  useEffect(() => {
    if (!enabled || !supabase || !userId) return;

    const inviteChannel = supabase
      .channel(`workspace-invites:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "experience_bridge_participants",
          filter: `user_id=eq.${userId}`,
        },
        () => bumpBridgeUpdated(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(inviteChannel);
    };
  }, [enabled, supabase, userId]);

  useEffect(() => {
    if (!enabled || !supabase || !userId) return;

    const syncOne = async (bridgeEventId: string) => {
      try {
        await syncBridgeSharedMediaFromRemote(bridgeEventId, userId);
        notifyBridgeSharedMediaUpdated();
        emitSharedWorkspaceSyncTick(bridgeEventId);
      } catch {
        // next tick
      }
    };

    const attach = () => {
      const sessions = listSharedWorkspaceSessions().filter((s) => s.syncActive);
      const channels = sessions.map((session) => {
        const id = session.bridgeEventId;
        void syncOne(id);
        return supabase
          .channel(`shared-workspace-sync:${id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "experience_bridge_contributions",
              filter: `bridge_event_id=eq.${id}`,
            },
            () => {
              void syncOne(id);
            },
          )
          .subscribe();
      });
      return () => {
        for (const ch of channels) void supabase.removeChannel(ch);
      };
    };

    let detach = attach();
    const onCommit = () => {
      detach();
      detach = attach();
    };
    window.addEventListener(SHARED_WORKSPACE_COMMITTED, onCommit);
    return () => {
      window.removeEventListener(SHARED_WORKSPACE_COMMITTED, onCommit);
      detach();
    };
  }, [enabled, supabase, userId]);
}
