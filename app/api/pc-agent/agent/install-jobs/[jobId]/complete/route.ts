import { NextRequest, NextResponse } from "next/server";
import { authenticatePcAgentRequest } from "@/lib/pc-local-agent/server-auth";
import { completeInstallJob } from "@/lib/pc-local-agent/capability-server";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function PATCH(_request: NextRequest, context: RouteContext) {
  const auth = await authenticatePcAgentRequest(_request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { jobId } = await context.params;
  const result = await completeInstallJob(jobId, auth.deviceId);

  return NextResponse.json({ ok: true, ...result });
}
