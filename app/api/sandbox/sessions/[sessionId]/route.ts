import { NextResponse } from "next/server";
import { sandboxController, serializeSandboxSession } from "@/lib/sandbox/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = sandboxController.getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }
  return NextResponse.json(serializeSandboxSession(session));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await sandboxController.stopSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }
  return NextResponse.json(serializeSandboxSession(session));
}
