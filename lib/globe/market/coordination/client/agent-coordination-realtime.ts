"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateClient } from "@/lib/supabase/client";

async function prepareRealtimeClient(supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return;
  }
  await supabase.realtime.setAuth(data.session.access_token);
}

export function subscribeAgentCoordinationRoomRealtime(
  handshakeId: string,
  onChange: () => void,
): () => void {
  const supabase = tryCreateClient();
  if (!supabase || !handshakeId.trim()) {
    return () => undefined;
  }

  let disposed = false;
  let channel: ReturnType<SupabaseClient["channel"]> | null = null;

  void prepareRealtimeClient(supabase).then(() => {
    if (disposed) {
      return;
    }
    channel = supabase
      .channel(`coordination-room:${handshakeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "market_agent_coordination_rooms",
          filter: `handshake_id=eq.${handshakeId}`,
        },
        () => onChange(),
      )
      .subscribe();
  });

  return () => {
    disposed = true;
    if (channel) {
      void supabase.removeChannel(channel);
    }
  };
}

export function subscribeAgentCoordinationListRealtime(onChange: () => void): () => void {
  const supabase = tryCreateClient();
  if (!supabase) {
    return () => undefined;
  }

  let disposed = false;
  let channel: ReturnType<SupabaseClient["channel"]> | null = null;

  void prepareRealtimeClient(supabase).then(() => {
    if (disposed) {
      return;
    }
    channel = supabase
      .channel("coordination-rooms:list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "market_agent_coordination_rooms",
        },
        () => onChange(),
      )
      .subscribe();
  });

  return () => {
    disposed = true;
    if (channel) {
      void supabase.removeChannel(channel);
    }
  };
}

export async function ensureCoordinationRealtimeAuth(
  supabase: SupabaseClient,
): Promise<void> {
  await prepareRealtimeClient(supabase);
}
