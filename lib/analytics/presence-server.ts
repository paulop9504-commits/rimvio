/**
 * Server presence upsert + active window aggregate (device/session).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  countPresenceRows,
  PRESENCE_ACTIVE_WINDOW_MS,
  type PresenceActiveCounts,
  type PresenceHeartbeatInput,
} from "@/lib/analytics/presence-types";
import type { Database } from "@/types/database";

/** In-memory fallback when Supabase is unset (local/dev). */
const memoryPresence = new Map<
  string,
  {
    device_id: string;
    session_id: string;
    last_seen_at: number;
    working: boolean;
    surface: string | null;
    path: string | null;
  }
>();

export async function upsertPresenceHeartbeat(
  supabase: SupabaseClient<Database> | null,
  input: PresenceHeartbeatInput,
): Promise<{ ok: true; persisted: boolean }> {
  const nowIso = new Date().toISOString();
  const row = {
    device_id: input.deviceId,
    session_id: input.sessionId,
    last_seen_at: nowIso,
    surface: input.surface?.trim().slice(0, 64) || null,
    working: Boolean(input.working),
    path: input.path?.trim().slice(0, 200) || null,
    updated_at: nowIso,
  };

  if (!supabase) {
    memoryPresence.set(input.deviceId, {
      device_id: input.deviceId,
      session_id: input.sessionId,
      last_seen_at: Date.now(),
      working: row.working,
      surface: row.surface,
      path: row.path,
    });
    return { ok: true, persisted: false };
  }

  const { error } = await supabase.from("analytics_presence").upsert(row, {
    onConflict: "device_id",
  });
  if (error) {
    throw error;
  }
  return { ok: true, persisted: true };
}

export async function fetchActivePresenceCounts(
  supabase: SupabaseClient<Database> | null,
  windowMs: number = PRESENCE_ACTIVE_WINDOW_MS,
): Promise<PresenceActiveCounts> {
  const sinceIso = new Date(Date.now() - windowMs).toISOString();
  const windowMinutes = Math.round(windowMs / 60_000);

  if (!supabase) {
    const now = Date.now();
    const rows = [...memoryPresence.values()].filter(
      (row) => now - row.last_seen_at <= windowMs,
    );
    return countPresenceRows(rows, windowMinutes);
  }

  const { data, error } = await supabase
    .from("analytics_presence")
    .select("device_id, session_id, working")
    .gte("last_seen_at", sinceIso);

  if (error) {
    throw error;
  }

  return countPresenceRows(data ?? [], windowMinutes);
}

/** Test helper — clear memory store. */
export function resetPresenceMemoryForTests() {
  memoryPresence.clear();
}
