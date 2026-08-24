import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { authenticatePcAgentRequest } from "@/lib/pc-local-agent/server-auth";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authenticatePcAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { taskId } = await context.params;
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data: task, error } = await admin
    .from("pc_local_agent_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("device_id", auth.deviceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!task) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ task });
}
