import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  authenticatePcAgentRequest,
  touchDeviceHeartbeat,
} from "@/lib/pc-local-agent/server-auth";
import type { OpenUrlPayload } from "@/lib/pc-local-agent";
import { isPcAgentNavigableUrl } from "@/lib/pc-local-agent/url-safety";
import { insertQueuedOpenUrlTask } from "@/lib/pc-local-agent/task-dispatch";

type CreateBody = {
  type?: string;
  payload?: OpenUrlPayload;
};

export async function POST(request: NextRequest) {
  const auth = await authenticatePcAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await touchDeviceHeartbeat(auth.deviceId);

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if ((body.type ?? "OPEN_URL") !== "OPEN_URL") {
    return NextResponse.json({ error: "unsupported_task_type" }, { status: 400 });
  }
  const url = body.payload?.url?.trim() ?? "";
  if (!url || !isPcAgentNavigableUrl(url)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
  const { data: device } = await admin
    .from("pc_local_agent_devices")
    .select("id, status")
    .eq("id", auth.deviceId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!device) {
    return NextResponse.json({ error: "device_not_found" }, { status: 404 });
  }

  const created = await insertQueuedOpenUrlTask({
    userId: auth.userId,
    deviceId: auth.deviceId,
    payload: {
      url,
      title: body.payload?.title,
      query: body.payload?.query,
      intent: body.payload?.intent,
      requiredCapabilities: body.payload?.requiredCapabilities,
    },
    offline: device.status !== "ONLINE",
  });
  if ("error" in created) {
    return NextResponse.json({ error: created.error }, { status: created.status });
  }
  return NextResponse.json({ task: created.task });
}
