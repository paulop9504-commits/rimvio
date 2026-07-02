import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { listActiveAgentCoordinationRoomsForUser } from "@/lib/globe/market/coordination/server/agent-coordination-room-server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, rooms: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const rooms = await listActiveAgentCoordinationRoomsForUser(supabase, user.id);
    return NextResponse.json({ ok: true, rooms });
  } catch (error) {
    const message = error instanceof Error ? error.message : "coordination_list_failed";
    if (
      message.includes("market_agent_coordination_rooms") ||
      message.includes("does not exist")
    ) {
      return NextResponse.json({ ok: true, rooms: [], migrationPending: true });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
