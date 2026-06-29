import { NextResponse } from "next/server";
import { devOnlyApiGuard } from "@/lib/dev/assert-dev-only-api";
import { buildContextSnapshot } from "@/lib/dev/build-context-snapshot";
import { computeRecallHitRate } from "@/lib/dev/compute-recall-hit-rate";
import { readLiveTurnLog } from "@/lib/dev/read-live-turn-log";
import type { ContextSnapshotServerPayload } from "@/lib/dev/context-snapshot-types";
import { createClient } from "@/lib/supabase/server";
import { listLifeEventCandidates } from "@/lib/life-read-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = devOnlyApiGuard();
  if (blocked) {
    return blocked;
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

  const serverSnapshot = buildContextSnapshot({
    events,
    contacts: [],
    conversationMemories: [],
    localPinEventIds: [],
    externalPinRows,
    liveTurns,
  });

  const recall = computeRecallHitRate({
    liveStream: serverSnapshot.liveStream,
    conversationMemoryCount: serverSnapshot.internal.conversationMemoryCount,
  });

  const payload: ContextSnapshotServerPayload = {
    builtAt: serverSnapshot.builtAt,
    liveStream: serverSnapshot.liveStream,
    externalPinRows,
    external: serverSnapshot.external,
    internal: serverSnapshot.internal,
    graph: serverSnapshot.graph,
    alerts: serverSnapshot.alerts,
  };

  return NextResponse.json({
    ok: true,
    server: payload,
    serverEventCount: events.length,
    liveTurnCount: liveTurns.length,
    recallHitRatePct: recall.hitRatePct,
    recallUtteranceCount: recall.recallUtteranceCount,
    peopleGraphNodeCount: serverSnapshot.internal.peopleCount,
    externalPinCount: serverSnapshot.external.externalPinCount,
    alertCount: serverSnapshot.alerts.length,
    dominantCluster: serverSnapshot.internal.dominantTrajectoryCluster,
  });
}
