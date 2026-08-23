import { NextRequest, NextResponse } from "next/server";
import {
  authenticatePcAgentRequest,
  touchDeviceHeartbeat,
} from "@/lib/pc-local-agent/server-auth";
import { expireStaleWaitingTasks } from "@/lib/pc-local-agent/capability-server";

export async function POST(request: NextRequest) {
  const auth = await authenticatePcAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await touchDeviceHeartbeat(auth.deviceId);
  await expireStaleWaitingTasks(auth.userId);

  return NextResponse.json({
    ok: true,
    deviceId: auth.deviceId,
    status: "ONLINE",
  });
}
