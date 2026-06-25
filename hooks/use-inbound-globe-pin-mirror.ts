"use client";

import { useEffect, useMemo } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/use-auth";
import { mirrorInboundSharedGlobePinIfNeeded } from "@/lib/peer-chat/mirror-inbound-shared-globe-pins";
import { sharedGlobePinFromMessageRow } from "@/lib/peer-chat/project-thread-globe-pins";
import type { PeerMessageRow } from "@/lib/peer-chat/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { tryCreateClient } from "@/lib/supabase/client";

const PEER_MESSAGES_TABLE = "peer_messages";

/** App-wide — mirror inbound friend globe pins without opening the room. */
export function useInboundGlobePinMirror(): void {
  const { user, configured } = useAuth();
  const supabase = useMemo(
    () => (configured && isSupabaseConfigured() ? tryCreateClient() : null),
    [configured],
  );

  useEffect(() => {
    const viewerUserId = user?.id?.trim();
    if (!supabase || !viewerUserId) {
      return;
    }

    const channel = supabase
      .channel("inbound-globe-pin-mirror")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: PEER_MESSAGES_TABLE,
        },
        (payload) => {
          const row = (payload as RealtimePostgresChangesPayload<PeerMessageRow>)
            .new as PeerMessageRow | undefined;
          if (!row?.id || row.sender_user_id === viewerUserId) {
            return;
          }
          const pin = sharedGlobePinFromMessageRow(row);
          if (!pin) {
            return;
          }
          mirrorInboundSharedGlobePinIfNeeded({
            pin,
            viewerUserId,
            peerDisplayName: pin.payload.senderDisplayName,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user?.id]);
}
