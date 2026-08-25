import { NextRequest, NextResponse } from "next/server";
import { authenticatePcAgentRequest } from "@/lib/pc-local-agent/server-auth";
import {
  isPcExecutionPhase,
  type PcAgentTaskResult,
} from "@/lib/pc-local-agent/execution-phase";
import { reportTaskExecutionPhase } from "@/lib/pc-local-agent/task-dispatch";

type RouteContext = { params: Promise<{ taskId: string }> };

type ProgressBody = PcAgentTaskResult & { phase?: string };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await authenticatePcAgentRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { taskId } = await context.params;
  let body: ProgressBody = {};
  try {
    body = (await request.json()) as ProgressBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!isPcExecutionPhase(body.phase)) {
    return NextResponse.json({ error: "invalid_phase" }, { status: 400 });
  }
  if (body.phase === "APPROVED" || body.phase === "CANCELLED") {
    return NextResponse.json({ error: "user_only_phase" }, { status: 403 });
  }

  const screenshot =
    typeof body.screenshotJpeg === "string"
      ? body.screenshotJpeg.slice(0, 220_000)
      : undefined;

  const reported = await reportTaskExecutionPhase({
    taskId,
    deviceId: auth.deviceId,
    phase: body.phase,
    patch: {
      ...body,
      screenshotJpeg: screenshot,
    },
  });
  if ("error" in reported) {
    return NextResponse.json({ error: reported.error }, { status: reported.status });
  }
  return NextResponse.json({ task: reported.task });
}
