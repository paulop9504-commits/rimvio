import { NextRequest, NextResponse } from "next/server";
import {
  authenticatePcAgentRequest,
  touchDeviceHeartbeat,
} from "@/lib/pc-local-agent/server-auth";
import { expireStaleWaitingTasks } from "@/lib/pc-local-agent/capability-server";
import { resumeParkedTasksForDevice } from "@/lib/pc-local-agent/task-dispatch";

export async function POST(request: NextRequest) {
  const auth = await authenticatePcAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let appVersion: string | null = null;
  try {
    const body = (await request.json()) as { version?: unknown };
    appVersion = typeof body.version === "string" ? body.version : null;
  } catch {
    appVersion = null;
  }

  await touchDeviceHeartbeat(auth.deviceId, appVersion);
  await expireStaleWaitingTasks(auth.userId);
  const resumed = await resumeParkedTasksForDevice(auth.deviceId);

  return NextResponse.json({
    ok: true,
    deviceId: auth.deviceId,
    status: "ONLINE",
    resumed,
  });
}
