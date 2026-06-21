import type { SupabaseClient } from "@supabase/supabase-js";

export type BridgeSyncCursorRow = {
  bridge_event_id: string;
  user_id: string;
  last_pulled_at: string;
  last_contribution_created_at: string | null;
  updated_at: string;
};

export async function upsertBridgeSyncCursor(
  supabase: SupabaseClient,
  input: {
    bridgeEventId: string;
    userId: string;
    lastPulledAt?: string;
    lastContributionCreatedAt?: string | null;
  },
): Promise<void> {
  const bridgeEventId = input.bridgeEventId.trim();
  const userId = input.userId.trim();
  if (!bridgeEventId || !userId) {
    return;
  }

  const stamp = input.lastPulledAt?.trim() || new Date().toISOString();

  const { error } = await supabase.from("experience_bridge_sync_cursors").upsert(
    {
      bridge_event_id: bridgeEventId,
      user_id: userId,
      last_pulled_at: stamp,
      last_contribution_created_at: input.lastContributionCreatedAt?.trim() || null,
      updated_at: stamp,
    },
    { onConflict: "bridge_event_id,user_id" },
  );

  if (error) {
    throw error;
  }
}

export async function readBridgeSyncCursor(
  supabase: SupabaseClient,
  bridgeEventId: string,
  userId: string,
): Promise<BridgeSyncCursorRow | null> {
  const { data, error } = await supabase
    .from("experience_bridge_sync_cursors")
    .select("*")
    .eq("bridge_event_id", bridgeEventId.trim())
    .eq("user_id", userId.trim())
    .maybeSingle();

  if (error) {
    throw error;
  }
  return (data as BridgeSyncCursorRow | null) ?? null;
}
