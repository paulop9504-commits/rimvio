import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { authenticatePcAgentRequest } from "@/lib/pc-local-agent/server-auth";
import type { OpenUrlResult } from "@/lib/pc-local-agent";
import {
  readExecutionPhase,
  readTaskResult,
} from "@/lib/pc-local-agent/execution-phase";
import type { PcAgentTask } from "@/lib/pc-local-agent";

type RouteContext = { params: Promise<{ taskId: string }> };

type CompleteBody = {
  result?: OpenUrlResult;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await authenticatePcAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { taskId } = await context.params;
  let body: CompleteBody = {};
  try {
    body = (await request.json()) as CompleteBody;
  } catch {
    // result optional
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data: existing } = await admin
    .from("pc_local_agent_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("device_id", auth.deviceId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (existing.status === "COMPLETED") {
    return NextResponse.json({ ok: true, idempotent: true });
  }
  const phase = readExecutionPhase(existing as PcAgentTask);
  if (phase === "WAITING_USER" || phase === "HUMAN_REQUIRED" || phase === "AUTH_REQUIRED") {
    return NextResponse.json({ error: "approval_required" }, { status: 409 });
  }
  const completable = new Set([
    "RUNNING",
    "DISPATCHED",
    "BROWSER_OPENED",
    "PAGE_READY",
    "ACTION_RUNNING",
    "APPROVED",
    "VERIFYING",
  ]);
  if (!completable.has(existing.status as string)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: task, error } = await admin
    .from("pc_local_agent_tasks")
    .update({
      status: "COMPLETED",
      result: {
        ...readTaskResult((existing as PcAgentTask).result),
        ...body.result,
        success: true,
        phase: "COMPLETED",
        latestEvent: body.result?.latestEvent ?? "completed",
      },
      completed_at: now,
      error: null,
    })
    .eq("id", taskId)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ task });
}
