import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { authenticatePcAgentRequest } from "@/lib/pc-local-agent/server-auth";

type RouteContext = { params: Promise<{ taskId: string }> };

type FailBody = {
  error?: string;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await authenticatePcAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { taskId } = await context.params;
  let body: FailBody = {};
  try {
    body = (await request.json()) as FailBody;
  } catch {
    // optional body
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data: existing } = await admin
    .from("pc_local_agent_tasks")
    .select("id, status, device_id")
    .eq("id", taskId)
    .eq("device_id", auth.deviceId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (existing.status === "FAILED") {
    return NextResponse.json({ ok: true, idempotent: true });
  }
  if (existing.status !== "RUNNING" && existing.status !== "QUEUED" && existing.status !== "DISPATCHED" && existing.status !== "ACTION_RUNNING" && existing.status !== "BROWSER_OPENED" && existing.status !== "PAGE_READY" && existing.status !== "VERIFYING" && existing.status !== "APPROVED") {
    return NextResponse.json({ error: "invalid_status" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: task, error } = await admin
    .from("pc_local_agent_tasks")
    .update({
      status: "FAILED",
      error: body.error?.trim() || "task_failed",
      completed_at: now,
    })
    .eq("id", taskId)
    .in("status", [
      "RUNNING",
      "QUEUED",
      "DISPATCHED",
      "ACTION_RUNNING",
      "BROWSER_OPENED",
      "PAGE_READY",
      "VERIFYING",
      "APPROVED",
    ])
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ task });
}
