import { NextResponse } from "next/server";
import { sandboxController } from "@/lib/sandbox/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ executionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { executionId } = await context.params;
  const session = sandboxController.getSession(executionId);
  if (!session) {
    return NextResponse.json({ error: "execution_not_found" }, { status: 404 });
  }
  return NextResponse.json({
    executionId: session.executionId,
    events: session.events,
    count: session.events.length,
  });
}
