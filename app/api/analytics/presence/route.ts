import { NextResponse, type NextRequest } from "next/server";
import {
  fetchActivePresenceCounts,
  upsertPresenceHeartbeat,
} from "@/lib/analytics/presence-server";
import { normalizePresenceIds } from "@/lib/analytics/presence-types";
import { tryCreateClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  deviceId?: string;
  sessionId?: string;
  surface?: string | null;
  path?: string | null;
  working?: boolean;
};

/** Heartbeat — guest-first device/session presence. */
export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const ids = normalizePresenceIds(body);
  if (!ids) {
    return NextResponse.json({ error: "invalid_ids" }, { status: 400 });
  }

  const supabase = await tryCreateClient();
  try {
    const result = await upsertPresenceHeartbeat(supabase, {
      deviceId: ids.deviceId,
      sessionId: ids.sessionId,
      surface: body.surface ?? null,
      path: body.path ?? null,
      working: Boolean(body.working),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "presence_upsert_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Aggregate only — activeDevices / activeSessions / workingDevices.
 * No device id list in response.
 */
export async function GET(request: NextRequest) {
  const minutesRaw = request.nextUrl.searchParams.get("minutes");
  const minutes = Math.min(
    60,
    Math.max(1, Number.parseInt(minutesRaw ?? "2", 10) || 2),
  );
  const windowMs = minutes * 60_000;
  const supabase = await tryCreateClient();
  try {
    const counts = await fetchActivePresenceCounts(supabase, windowMs);
    return NextResponse.json({ ok: true, ...counts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "presence_read_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
