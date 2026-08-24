import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  authenticatePcAgentRequest,
  touchDeviceHeartbeat,
} from "@/lib/pc-local-agent/server-auth";
import type { PcAgentTask } from "@/lib/pc-local-agent";
import {
  isCheckoutResumePhase,
  isClaimableQueuedPhase,
  readExecutionPhase,
  readTaskResult,
} from "@/lib/pc-local-agent/execution-phase";

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

  const { data: queued } = await admin
    .from("pc_local_agent_tasks")
    .select("*")
    .eq("device_id", auth.deviceId)
    .eq("user_id", auth.userId)
    .in("status", ["QUEUED", "DISPATCHED"])
    .order("created_at", { ascending: true })
    .limit(8);

  const ready = (queued ?? []).find((row) =>
    isClaimableQueuedPhase(readExecutionPhase(row as PcAgentTask)),
  );

  if (ready) {
    const now = new Date().toISOString();
    const result = {
      ...readTaskResult((ready as PcAgentTask).result),
      phase: "DISPATCHED" as const,
      latestEvent: "dispatched",
    };
    const { data: claimed, error } = await admin
      .from("pc_local_agent_tasks")
      .update({
        status: "DISPATCHED",
        started_at: now,
        claimed_by_agent_at: now,
        result,
      })
      .eq("id", ready.id)
      .in("status", ["QUEUED", "DISPATCHED"])
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ task: claimed ?? null });
  }

  const { data: approved } = await admin
    .from("pc_local_agent_tasks")
    .select("*")
    .eq("device_id", auth.deviceId)
    .eq("user_id", auth.userId)
    .eq("status", "APPROVED")
    .order("created_at", { ascending: true })
    .limit(8);

  const resume = (approved ?? []).find((row) =>
    isCheckoutResumePhase(readExecutionPhase(row as PcAgentTask)),
  );

  return NextResponse.json({ task: (resume as PcAgentTask | undefined) ?? null });
}
