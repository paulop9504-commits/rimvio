import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  authenticatePcAgentRequest,
  touchDeviceHeartbeat,
} from "@/lib/pc-local-agent/server-auth";
import { PC_AGENT_WAITING_TIMEOUT_MS } from "@/lib/pc-local-agent/types";
import { createCapabilityRequest } from "@/lib/pc-local-agent/capability-server";

type RouteContext = { params: Promise<{ taskId: string }> };

type WaitBody = {
  missingCapabilities?: string[];
  reason?: string;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await authenticatePcAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await touchDeviceHeartbeat(auth.deviceId);

  const { taskId } = await context.params;
  let body: WaitBody = {};
  try {
    body = (await request.json()) as WaitBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const missing = body.missingCapabilities?.filter(Boolean) ?? [];
  if (missing.length === 0) {
    return NextResponse.json({ error: "missing_capabilities" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data: task } = await admin
    .from("pc_local_agent_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("device_id", auth.deviceId)
    .maybeSingle();

  if (!task) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (task.status !== "RUNNING") {
    return NextResponse.json({ error: "invalid_status" }, { status: 409 });
  }

  const payload = {
    ...(task.payload as Record<string, unknown>),
    waitReason: "capability_required",
    requiredCapabilities: missing,
    resumeAfterInstall: true,
  };

  const waitingExpiresAt = new Date(
    Date.now() + PC_AGENT_WAITING_TIMEOUT_MS,
  ).toISOString();

  const { data: waitingTask, error: waitError } = await admin
    .from("pc_local_agent_tasks")
    .update({
      status: "WAITING",
      payload,
      error: null,
      waiting_expires_at: waitingExpiresAt,
    })
    .eq("id", taskId)
    .eq("status", "RUNNING")
    .select("*")
    .maybeSingle();

  if (waitError || !waitingTask) {
    return NextResponse.json({ error: waitError?.message ?? "wait_failed" }, { status: 500 });
  }

  const capabilityRequest = await createCapabilityRequest({
    userId: auth.userId,
    deviceId: auth.deviceId,
    taskId,
    missingCapabilities: missing,
    reason: body.reason,
  });

  return NextResponse.json({
    task: waitingTask,
    capabilityRequest,
  });
}
