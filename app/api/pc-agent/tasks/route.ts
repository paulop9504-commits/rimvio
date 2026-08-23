import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { OpenUrlPayload, PcAgentTaskType } from "@/lib/pc-local-agent";

type CreateTaskBody = {
  deviceId?: string;
  type?: PcAgentTaskType;
  payload?: OpenUrlPayload & { requiredCapabilities?: string[] };
};

function validateOpenUrlPayload(payload: OpenUrlPayload | undefined): string | null {
  const url = payload?.url?.trim();
  if (!url) {
    return "missing_url";
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "invalid_url_protocol";
    }
  } catch {
    return "invalid_url";
  }
  return null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  let body: CreateTaskBody;
  try {
    body = (await request.json()) as CreateTaskBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const deviceId = body.deviceId?.trim();
  const type = body.type ?? "OPEN_URL";
  if (!deviceId) {
    return NextResponse.json({ error: "missing_device_id" }, { status: 400 });
  }
  if (type !== "OPEN_URL") {
    return NextResponse.json({ error: "unsupported_task_type" }, { status: 400 });
  }

  const payloadError = validateOpenUrlPayload(body.payload);
  if (payloadError) {
    return NextResponse.json({ error: payloadError }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data: device } = await admin
    .from("pc_local_agent_devices")
    .select("id, user_id, status")
    .eq("id", deviceId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!device) {
    return NextResponse.json({ error: "device_not_found" }, { status: 404 });
  }
  if (device.status !== "ONLINE") {
    return NextResponse.json({ error: "device_offline" }, { status: 409 });
  }

  const payload = {
    url: body.payload!.url.trim(),
    ...(body.payload?.requiredCapabilities?.length
      ? { requiredCapabilities: body.payload.requiredCapabilities }
      : {}),
  };
  const { data: task, error } = await admin
    .from("pc_local_agent_tasks")
    .insert({
      user_id: auth.user.id,
      device_id: deviceId,
      type,
      payload,
      status: "QUEUED",
    })
    .select("*")
    .single();

  if (error || !task) {
    return NextResponse.json({ error: error?.message ?? "task_create_failed" }, { status: 500 });
  }

  return NextResponse.json({ task });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 10), 50);

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  const { data, error } = await admin
    .from("pc_local_agent_tasks")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data ?? [] });
}
