import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { canTransitionTaskStatus } from "@/lib/pc-local-agent/task-state-machine";
import type { PcAgentTask, PcAgentTaskStatus } from "@/lib/pc-local-agent";
import {
  applyReportedPhase,
  readExecutionPhase,
  readTaskResult,
} from "@/lib/pc-local-agent/execution-phase";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
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
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!task) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const { taskId } = await context.params;
  let body: { action?: string };
  try {
    body = (await request.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (body.action !== "cancel" && body.action !== "approve") {
    return NextResponse.json({ error: "unsupported_action" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data: task, error } = await admin
    .from("pc_local_agent_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!task) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const current = task as PcAgentTask;
  const status = current.status as PcAgentTaskStatus;

  if (body.action === "cancel") {
    if (!canTransitionTaskStatus(status, "CANCELLED")) {
      return NextResponse.json({ error: "cannot_cancel" }, { status: 409 });
    }
    const { data: updated, error: updateError } = await admin
      .from("pc_local_agent_tasks")
      .update({
        status: "CANCELLED",
        error: "user_stopped",
        completed_at: new Date().toISOString(),
        result: {
          ...readTaskResult(current.result),
          phase: "CANCELLED",
          latestEvent: "cancelled",
        },
      })
      .eq("id", taskId)
      .eq("user_id", auth.user.id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message ?? "cancel_failed" },
        { status: 500 },
      );
    }
    return NextResponse.json({ task: updated });
  }

  const from = readExecutionPhase(current);
  const applied = applyReportedPhase({
    from,
    to: "APPROVED",
    result: {
      ...readTaskResult(current.result),
      latestEvent: "approved",
      graphNode: "CHECKOUT",
    },
  });
  if (!applied.ok) {
    return NextResponse.json({ error: "cannot_approve" }, { status: 409 });
  }
  if (!canTransitionTaskStatus(status, applied.status) && status !== applied.status) {
    return NextResponse.json({ error: "cannot_approve" }, { status: 409 });
  }

  const { data: updated, error: updateError } = await admin
    .from("pc_local_agent_tasks")
    .update({
      status: applied.status,
      result: applied.result,
      waiting_expires_at: null,
      error: null,
    })
    .eq("id", taskId)
    .eq("user_id", auth.user.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "approve_failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ task: updated });
}
