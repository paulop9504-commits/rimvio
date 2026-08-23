import { NextRequest, NextResponse } from "next/server";
import { authenticatePcAgentRequest } from "@/lib/pc-local-agent/server-auth";
import { updateInstallJobProgress } from "@/lib/pc-local-agent/capability-server";

type RouteContext = { params: Promise<{ jobId: string }> };

type ProgressBody = { progressPct?: number };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await authenticatePcAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { jobId } = await context.params;
  let body: ProgressBody = {};
  try {
    body = (await request.json()) as ProgressBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const progressPct = Number(body.progressPct ?? 0);
  if (Number.isNaN(progressPct)) {
    return NextResponse.json({ error: "invalid_progress" }, { status: 400 });
  }

  await updateInstallJobProgress(jobId, auth.deviceId, progressPct);

  return NextResponse.json({ ok: true, progressPct });
}
