import { NextResponse } from "next/server";
import { sandboxController, serializeSandboxSession } from "@/lib/sandbox/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = sandboxController.getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  const queued = sandboxController.queueExecution(sessionId);
  if (!queued.ok) {
    return NextResponse.json({ error: queued.error ?? "queue_failed" }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    started: true,
    sessionId,
    executionId: sessionId,
  });
}
