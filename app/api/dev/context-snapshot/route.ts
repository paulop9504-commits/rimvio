import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readLiveTurnLog } from "@/lib/dev/read-live-turn-log";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import { buildContextSnapshot } from "@/lib/dev/build-context-snapshot";
import type { ContextSnapshotServerPayload } from "@/lib/dev/context-snapshot-types";

export const runtime = "nodejs";

function devOnly() {
  return process.env.NODE_ENV === "production";
}

export async function GET() {
  if (devOnly()) {
    return NextResponse.json({ error: "Dev only" }, { status: 404 });
  }

  const liveTurns = readLiveTurnLog(120);
  const events = listLifeEventCandidates();

  let externalPinRows: Array<{
    event_id: string;
    visibility: "private" | "external";
    updated_at?: string;
  }> = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("personal_globe_pins")
        .select("event_id,visibility,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(500);

      if (!error && data) {
        externalPinRows = data.map((row) => ({
          event_id: row.event_id,
          visibility:
            row.visibility === "external" ? "external" : "private",
          updated_at: row.updated_at,
        }));
      }
    }
  } catch {
    // Supabase optional in local dev
  }

  const snapshot = buildContextSnapshot({
    events,
    contacts: [],
    conversationMemories: [],
    localPinEventIds: [],
    externalPinRows,
    liveTurns,
  });

  const payload: ContextSnapshotServerPayload = {
    builtAt: snapshot.builtAt,
    liveStream: snapshot.liveStream,
    externalPinRows,
    external: snapshot.external,
  };

  return NextResponse.json({
    ok: true,
    server: payload,
    serverEventCount: events.length,
    liveTurnCount: liveTurns.length,
  });
}
