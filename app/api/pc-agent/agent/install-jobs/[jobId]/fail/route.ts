import { NextRequest, NextResponse } from "next/server";
import { authenticatePcAgentRequest } from "@/lib/pc-local-agent/server-auth";
import { failInstallJob } from "@/lib/pc-local-agent/capability-server";

type RouteContext = { params: Promise<{ jobId: string }> };

type FailBody = { error?: string };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await authenticatePcAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { jobId } = await context.params;
  let body: FailBody = {};
  try {
    body = (await request.json()) as FailBody;
  } catch {
    // optional
  }

  await failInstallJob(jobId, auth.deviceId, body.error?.trim() || "install_failed");

  return NextResponse.json({ ok: true });
}
