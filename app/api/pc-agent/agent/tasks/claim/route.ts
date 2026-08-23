import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  authenticatePcAgentRequest,
  touchDeviceHeartbeat,
} from "@/lib/pc-local-agent/server-auth";

export async function POST(request: NextRequest) {
  const auth = await authenticatePcAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await touchDeviceHeartbeat(auth.deviceId);

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data: task } = await admin
    .from("pc_local_agent_tasks")
    .select("*")
    .eq("device_id", auth.deviceId)
    .eq("user_id", auth.userId)
    .eq("status", "QUEUED")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!task) {
    return NextResponse.json({ task: null });
  }

  const now = new Date().toISOString();
  const { data: claimed, error } = await admin
    .from("pc_local_agent_tasks")
    .update({
      status: "RUNNING",
      started_at: now,
      claimed_by_agent_at: now,
    })
    .eq("id", task.id)
    .eq("status", "QUEUED")
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ task: claimed ?? null });
}
