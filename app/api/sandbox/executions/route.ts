import { NextResponse } from "next/server";
import { sandboxController, serializeSandboxSession } from "@/lib/sandbox/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: {
    capability?: string;
    capabilityId?: string;
    userRequest?: string;
    input?: Record<string, unknown>;
    userId?: string | null;
    projectId?: string | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const capability = (body.capability ?? body.capabilityId)?.trim();
  if (!capability) {
    return NextResponse.json({ error: "capability_required" }, { status: 400 });
  }

  const session = sandboxController.createSession({
    capability,
    userRequest: body.userRequest,
    input: body.input,
    userId: body.userId,
    projectId: body.projectId,
  });

  const queued = sandboxController.queueExecution(session.sessionId);
  if (!queued.ok) {
    return NextResponse.json({ error: queued.error ?? "queue_failed" }, { status: 400 });
  }

  return NextResponse.json(
    {
      ...serializeSandboxSession(session),
      executionId: session.executionId,
      queued: true,
    },
    { status: 201 },
  );
}
