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

  const { data: jobs } = await admin
    .from("pc_local_agent_install_jobs")
    .select("*")
    .eq("device_id", auth.deviceId)
    .eq("status", "queued")
    .order("created_at", { ascending: true });

  if (!jobs?.length) {
    return NextResponse.json({ jobs: [] });
  }

  const now = new Date().toISOString();
  const claimed: NonNullable<typeof jobs> = [];

  for (const job of jobs) {
    const { data: updated } = await admin
      .from("pc_local_agent_install_jobs")
      .update({ status: "running", started_at: now })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();

    if (updated) {
      claimed.push(updated);
    }
  }

  return NextResponse.json({ jobs: claimed });
}
