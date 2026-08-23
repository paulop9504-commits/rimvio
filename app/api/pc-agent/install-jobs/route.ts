import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getCapabilityDefinition } from "@/lib/pc-local-agent/capabilities";
import type { InstallJob } from "@/lib/pc-local-agent/capabilities/types";

export async function GET(request: NextRequest) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const deviceId = request.nextUrl.searchParams.get("deviceId")?.trim();
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data: devices } = await admin
    .from("pc_local_agent_devices")
    .select("id")
    .eq("user_id", auth.user.id);

  const deviceIds = deviceId
    ? devices?.some((d) => d.id === deviceId)
      ? [deviceId]
      : []
    : (devices ?? []).map((d) => d.id);

  if (deviceIds.length === 0) {
    return NextResponse.json({ jobs: [] });
  }

  const { data, error } = await admin
    .from("pc_local_agent_install_jobs")
    .select("*")
    .in("device_id", deviceIds)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const jobs = ((data ?? []) as InstallJob[]).map((job) => ({
    ...job,
    capabilityName:
      getCapabilityDefinition(job.capability_id)?.name ?? job.capability_id,
  }));

  return NextResponse.json({ jobs });
}
